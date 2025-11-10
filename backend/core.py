from LLM_utils.ocr import TaskRecognizer
from LLM_utils.mark_errors import WebMarkingError, highlight_by_indices
from LLM_utils.promts import prompt_decompose_solution
from LLM_utils.utils import ask_llm
from db_manager import DatabaseManager
import os
import json


def determine_difficulty_with_ai(task_statement):
    """Определяет сложность задачи через ИИ"""
    try:
        prompt = f"""Определи сложность следующей математической задачи. Ответь только одним словом: easy, medium, hard или expert.

Задача: {task_statement}

Ответ (только одно слово):"""
        
        # Используем простую модель для определения сложности
        MODEL2 = os.environ.get('MODEL2', 'Qwen/Qwen3-4B-Instruct-2507')
        response = ask_llm(prompt, MODEL2, max_retries=1, show=False)
        
        # Извлекаем сложность из ответа
        response_lower = response.lower().strip()
        if 'easy' in response_lower:
            return 'easy'
        elif 'medium' in response_lower or 'средн' in response_lower:
            return 'medium'
        elif 'hard' in response_lower or 'сложн' in response_lower:
            return 'hard'
        elif 'expert' in response_lower:
            return 'expert'
        else:
            return 'medium'  # По умолчанию
    except Exception as e:
        print(f"[OCR] Error determining difficulty: {e}")
        return 'medium'  # По умолчанию при ошибке


def ocr_use(path, id_submission, text):
    try:
        print(f"[OCR] Starting processing for submission {id_submission}")
        db = DatabaseManager()
        
        # Проверяем, есть ли уже решение этой задачи в БД
        task_data = db.get_task_by_statement(text)
        if task_data and task_data[1]:  # task_data[1] - это solution
            print(f"[OCR] Found existing solution in DB for task, skipping LLM processing")
            existing_solution = task_data[1]
            category = task_data[2] if len(task_data) > 2 else None
            difficulty = task_data[3] if len(task_data) > 3 else None
            
            # Используем существующее решение из БД
            recognizer = TaskRecognizer()
            res = recognizer.add_task(text, path)
            if res == 'Неверный формат файла':
                print(f"[OCR] Invalid file format for submission {id_submission}")
                db.update_submission(id_submission, '', 'Error Parsing', '', 0)
                return

            print(f"[OCR] Running recognition for submission {id_submission}")
            recognizer.run_recognition()
            user_solution = recognizer.get_task_texts()[0]
            
            # Используем решение из БД для проверки
            print(f"[OCR] Using solution from DB for error checking, skipping LLM solution generation")
            prompts = {'decompose': prompt_decompose_solution}
            web = WebMarkingError(prompts)
            
            db.update_submission(id_submission, user_solution, 'Processing', '', 0)
            
            # Переопределяем метод solve_task чтобы использовать решение из БД вместо генерации через LLM
            original_solve_task = web.solve_task
            def use_db_solution(task):
                return existing_solution
            web.solve_task = use_db_solution
            
            # Используем существующее решение из БД вместо генерации нового
            dia, hints, mark, accuracy, our_sol, dec_our_sol = web(text, user_solution)
            print(hints)
            
            # Проверяем, если решение не соответствует условию (match < 80)
            if dia == '__NO_MATCH__':
                result = 'Решение не соотносится с условием'
                hints = []  # Удаляем подсказки
                print(f"[OCR] Solution does not match task condition (match < 80%)")
            else:
                result = highlight_by_indices(user_solution, dia)

            print(f"[OCR] Error checking completed for submission {id_submission}, updating status to 'OK'")
            db.update_submission(id_submission, result, 'OK', '<SEP>'.join(hints), accuracy)
            
            # Сохраняем decompose_solution (правильное решение, разложенное на шаги) в БД
            try:
                # Преобразуем decompose_solution в строку для сохранения
                if isinstance(dec_our_sol, dict):
                    # Если это словарь с шагами, преобразуем в форматированную строку с шагами
                    # Формат: каждый шаг на новой строке
                    solution_to_save = '\n'.join([f"Шаг {k}: {v}" for k, v in sorted(dec_our_sol.items(), key=lambda x: int(x[0]) if str(x[0]).isdigit() else 0)])
                elif dec_our_sol:
                    solution_to_save = str(dec_our_sol)
                else:
                    solution_to_save = our_sol if our_sol else ''
                
                # Определяем сложность через ИИ, если её еще нет
                existing_task = db.get_task_by_statement(text)
                if existing_task and existing_task[3]:  # Если сложность уже есть
                    difficulty = existing_task[3]
                    print(f"[OCR] Using existing difficulty: {difficulty}")
                else:
                    # Определяем сложность через ИИ
                    difficulty = determine_difficulty_with_ai(text)
                    print(f"[OCR] Determined difficulty via AI: {difficulty}")
                
                task_id = db.save_task_solution(text, solution_to_save, category, difficulty)
                print(f"[OCR] Decompose solution saved to tasks table with id {task_id}, difficulty: {difficulty}")
            except Exception as save_err:
                print(f"[OCR] Error saving decompose solution to tasks: {save_err}")
            
            print(f"[OCR] Processing completed successfully for submission {id_submission}")
            return
        
        # Если решения нет в БД, обрабатываем как обычно
        recognizer = TaskRecognizer()
        res = recognizer.add_task(text, path)
        if res == 'Неверный формат файла':
            print(f"[OCR] Invalid file format for submission {id_submission}")
            db.update_submission(id_submission, '', 'Error Parsing', '', 0)
            return

        print(f"[OCR] Running recognition for submission {id_submission}")
        # Для .txt файлов пропускаем OCR, для остальных запускаем
        recognizer.run_recognition()

        solution = recognizer.get_task_texts()[0]
        print(f"[OCR] Recognition completed for submission {id_submission}, updating status to 'Check solution'")
        db.update_submission(id_submission, solution, 'Check solution', '', 0)

        print(f"[OCR] Starting error checking for submission {id_submission}")
        prompts = {'decompose': prompt_decompose_solution}
        web = WebMarkingError(prompts)
        
        # Обновляем статус перед началом проверки ошибок
        db.update_submission(id_submission, solution, 'Processing', '', 0)
        
        dia, hints, mark, accuracy, our_sol, dec_our_sol = web(text, solution)
        print(hints)
        
        # Проверяем, если решение не соответствует условию (match < 80)
        if dia == '__NO_MATCH__':
            result = 'Решение не соотносится с условием'
            hints = []  # Удаляем подсказки
            print(f"[OCR] Solution does not match task condition (match < 80%)")
        else:
            result = highlight_by_indices(solution, dia)

        print(f"[OCR] Error checking completed for submission {id_submission}, updating status to 'OK'")
        db.update_submission(id_submission, result, 'OK', '<SEP>'.join(hints), accuracy)
        
        # Сохраняем decompose_solution (правильное решение, разложенное на шаги) в таблицу tasks
        # Определяем category и difficulty
        category = None  # Можно добавить логику определения категории
        
        # Определяем сложность через ИИ, если её еще нет
        existing_task = db.get_task_by_statement(text)
        if existing_task and existing_task[3]:  # Если сложность уже есть
            difficulty = existing_task[3]
            print(f"[OCR] Using existing difficulty: {difficulty}")
        else:
            # Определяем сложность через ИИ
            difficulty = determine_difficulty_with_ai(text)
            print(f"[OCR] Determined difficulty via AI: {difficulty}")
        
        # Сохраняем правильное решение с разложением на шаги в БД
        try:
            # Преобразуем decompose_solution в строку для сохранения
            if isinstance(dec_our_sol, dict):
                # Если это словарь с шагами, преобразуем в форматированную строку с шагами
                # Формат: каждый шаг на новой строке
                solution_to_save = '\n'.join([f"Шаг {k}: {v}" for k, v in sorted(dec_our_sol.items(), key=lambda x: int(x[0]) if str(x[0]).isdigit() else 0)])
            elif dec_our_sol:
                solution_to_save = str(dec_our_sol)
            else:
                solution_to_save = our_sol if our_sol else ''
            
            task_id = db.save_task_solution(text, solution_to_save, category, difficulty)
            print(f"[OCR] Decompose solution saved to tasks table with id {task_id}, difficulty: {difficulty}")
        except Exception as save_err:
            print(f"[OCR] Error saving decompose solution to tasks: {save_err}")
        
        print(f"[OCR] Processing completed successfully for submission {id_submission}")
    except Exception as e:
        print(f"[OCR] Error processing submission {id_submission}: {e}")
        import traceback
        traceback.print_exc()
        DatabaseManager().update_submission(id_submission, '', 'Error Parsing', '', 0)
