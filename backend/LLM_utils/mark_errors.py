from .promts import *
from .utils import *
from dotenv import load_dotenv
import os
import sys

# Добавляем путь к backend для импорта DatabaseManager
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
from backend.db_manager import DatabaseManager

# Загружаем .env файл из корня проекта
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(ENV_PATH)

# Получаем переменные окружения с значениями по умолчанию
MODEL1 = os.environ.get('MODEL1', '')
MODEL2 = os.environ.get('MODEL2', '')
MODEL3 = os.environ.get('MODEL3', '')


# Функция маркирует в тексте ошибки красным
def highlight_by_indices(text, intervals):
    HIGHLIGHT_START = "<error>"  # красный
    HIGHLIGHT_END = "<error>"

    intervals = sorted(intervals, key=lambda x: x[0])
    result = ""
    last_index = 0
    for start, end in intervals:
        result += text[last_index:start]
        result += f"{HIGHLIGHT_START}{text[start:end]}{HIGHLIGHT_END}"
        # result += f"[ERROR]{text[start:end]}[ERROR]"
        last_index = end
    result += text[last_index:]
    return result


# Класс для маркировки ошибок в тексте
# Пайплайн простой:
# 1) Делаем правильное решение задачи
# 2) Разделяем на шаги решение сгенерированое нейронкой
# 3) Разделяем на шаги решение которое прислал пользователь
# 4) С помощью тегов просим нейронку найти ошибки в тексте и сразу же их парсим, получая символьные диапазоны
# 5) Выделяем ошибки с помощью тегов HIGHLIGHT
class WebMarkingError:
    def __init__(self, prompts, batch_size=10):
        self.ask_llm = ask_llm
        self.prompts = prompts
        self.batch_size = batch_size

    # 1) Делаем правильное решение задачи
    def solve_task(self, task):
        results = rerun_until_filled(MODEL1,
                                     [task],
                                     show_progress=True,
                                     title='Make solutions',
                                     sleep=1.0)  # Увеличили задержку между запросами
        return results[0]

    # 3) Разделяем на шаги решение которое прислал пользователь
    def decompose_solutions(self, text):
        dec_prompts = [self.prompts['decompose'].replace('{SOLUTION}', text.replace('\n', '  '))]
        results = rerun_until_filled(
            MODEL3,
            dec_prompts,
            show_progress=True,
            title='',
            texts_for_decompose=[text],
            sleep=1.0  # Увеличили задержку между запросами
        )
        return list(results[0].keys()), list(results[0].values())  # steps, indexes

    # 2) Разделяем на шаги решение сгенерированое нейронкой
    def decompose_our_solutions(self, solution):
        dec_prompt = [self.prompts['decompose'].replace('{SOLUTION}', solution.replace('\n', '  '))]
        results = rerun_until_filled(
            MODEL2,
            dec_prompt,
            show_progress=True,
            title='Decompose tasks',
            sleep=1.0,  # Увеличили задержку между запросами
            # texts_for_decompose=solution
        )
        # print(results)
        # steps = re.findall(r'''\d+\.\s[\"\' ]*(.*?)[\"\' ]*(?=\n\d+\.|$)''', results[0], flags=re.S)
        return results[0]  # '\n'.join(f"{i + 1}. {x}" for i, x in enumerate(steps))

    def get_prompt(self, task, steps, steps_our_solution):
        prompt = make_prompts(task, steps, steps_our_solution, self.batch_size)
        p = []
        for i in prompt:
            p += [i]
        return p

    def group_marking(self, all_responses, solution, indexes):
        pattern = r"\d+\.\s(.*?)(?=\n\d+\.|$)"
        joined = "\n".join(all_responses)
        ans_steps = re.findall(pattern, joined, flags=re.S)
        return extract(ans_steps, indexes, solution)

    def match(self, task, solution):
        while True:
            try:
                res = ask_llm(matching.replace('TASK', task).replace('TEXT', solution), MODEL3)
                return int(res)
            except Exception as e:
                continue

    # 4) С помощью тегов просим нейронку найти ошибки в тексте
    def find_errors(self, task, steps, indexes, steps_our_solution, solution):
        self.get_prompt(task, steps, steps_our_solution)
        all_responses = rerun_until_filled(
            MODEL1,
            self.get_prompt(task, steps, steps_our_solution),
            show_progress=True,  # пусть покажет общий прогресс
            title='Errors markering',
            sleep=1.0  # Увеличили задержку между запросами
        )
        # и сразу же их парсим, получая символьные диапазоны
        final_result = self.group_marking(all_responses, solution, indexes)
        return final_result

    def inference(self, task, solution):
        match_score = self.match(task, solution)
        if match_score < 80:
            # Возвращаем специальный маркер для несоответствия
            return '__NO_MATCH__', [], '', 0, '', ''
        # Проверяем, есть ли уже dec_our_sol в БД для этой задачи
        db = DatabaseManager()
        task_data = db.get_task_by_statement(task)

        if task_data and task_data[1]:  # task_data[1] - это solution (dec_our_sol)
            # Используем существующее решение из БД
            print(f"[MarkErrors] Found existing dec_our_sol in DB for task, skipping LLM processing")
            dec_our_sol = task_data[1]
            # our_sol можно сделать пустым, так как dec_our_sol уже есть
            our_sol = ""
        else:
            # Создаем решение через LLM
            our_sol = self.solve_task(task)
            dec_our_sol = self.decompose_our_solutions(our_sol)

            # Сохраняем dec_our_sol в БД
            try:
                # Преобразуем dec_our_sol в строку для сохранения
                if isinstance(dec_our_sol, dict):
                    # Если это словарь с шагами, преобразуем в форматированную строку с шагами
                    solution_to_save = '\n'.join([f"Шаг {k}: {v}" for k, v in sorted(dec_our_sol.items(),
                                                                                     key=lambda x: int(x[0]) if str(
                                                                                         x[0]).isdigit() else 0)])
                elif dec_our_sol:
                    solution_to_save = str(dec_our_sol)
                else:
                    solution_to_save = our_sol if our_sol else ''

                # Сохраняем в БД
                db.save_task_solution(task, solution_to_save, category=None, difficulty=None)
                print(f"[MarkErrors] Saved dec_our_sol to tasks table")
            except Exception as save_err:
                print(f"[MarkErrors] Error saving dec_our_sol to tasks: {save_err}")
        print(1111111)
        steps, indexes = self.decompose_solutions(solution)
        n_steps = len(steps)
        return self.find_errors(task, steps, indexes, dec_our_sol, solution), self.mark(task), self.hints(task,
                                                                                                          '\n'.join(
                                                                                                              steps),
                                                                                                          dec_our_sol), n_steps, our_sol, dec_our_sol

    def mark(self, task):
        res = ask_llm(mark.replace('TASK', task), MODEL3)
        print(res)
        while len(res) != 1:
            res = ask_llm(mark.replace('TASK', task), MODEL3)
            print(res)
        print(2222222)
        return res

    def hints(self, task, sol, sol_c):
        pattern = r"Подсказка\s*\d+\s*(.*?)(?=Подсказка\s*\d+|$)"
        res = ask_llm(
            hints.replace('{task}', task).replace('{correct_solution}', sol_c).replace('{wrong_solution}', sol),
            MODEL3)
        print(res)
        matches = re.findall(pattern, res, flags=re.DOTALL | re.IGNORECASE)
        res = [m.strip() for m in matches if m.strip()]
        print(res)
        while len(res) != 3:
            res = ask_llm(
                hints.replace('{task}', task).replace('{correct_solution}', sol_c).replace('{wrong_solution}', sol),
                MODEL3)
            print(res)
            matches = re.findall(pattern, res, flags=re.DOTALL | re.IGNORECASE)
            res = [m.strip() for m in matches if m.strip()]
            print(res)
        print(33333333)
        return res

        # 5) Выделяем ошибки с помощью тегов HIGHLIGHT

    def __call__(self, task, solution):
        dia, mark, hints, n, our_sol, dec_our_sol = self.inference(task, solution)
        if n:
            accuracy = int(max(n - len(dia), 0) / n * 100)
        else:
            accuracy = 0
        print(44444444)
        return dia, hints, mark, accuracy, our_sol, dec_our_sol
