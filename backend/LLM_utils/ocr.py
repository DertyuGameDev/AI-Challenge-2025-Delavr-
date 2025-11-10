import os
from openai import OpenAI
from tqdm import tqdm
from PIL import Image
import fitz
import io
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor, as_completed
import base64
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(ENV_PATH)

OPENROUTER_KEY = os.getenv('TOKEN2', '')
OPENROUTER_URL = "https://openrouter.ai/api/v1"
OPENROUTER_MODEL = 'google/gemini-2.5-pro'

client = OpenAI(
    base_url=OPENROUTER_URL,
    api_key=OPENROUTER_KEY,
)


def ask_llm(img: Image.Image, prompt: str, show=True):
    b64 = image_to_base64(img)
    while True:
        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    ]
                }
            ]  # , temperature=0.1
        )
        result = response.choices[0].message.content

        if result:
            return result


def pdf_to_images(pdf_path: str, dpi: int = 200):
    doc = fitz.open(pdf_path)
    zoom = dpi / 72
    mat = fitz.Matrix(zoom, zoom)
    imgs = []
    for page in doc:
        pix = page.get_pixmap(matrix=mat, alpha=False)
        b = pix.tobytes("png")
        img = Image.open(io.BytesIO(b)).convert("RGB")
        imgs.append(img)
    doc.close()
    return imgs


def image_to_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def build_prompt(task_text: str) -> str:
    return (
            "Тебе дано изображение страницы решения. Распознай изображение 1:1 и верни ровно один цельный фрагмент русского текста"
            "без LaTeX, без Markdown и без любой другой разметки.\n"
            "Правила формата:\n"
            "1) Пиши связным научным стилем;\n"
            "2) Математику передавай обычными символами: sqrt(x), ln x, sin x, cos x, e^(...), 1/(x+2), (x+1)/(x+2), x->+∞.\n"
            "3) Сохраняй порядок изложения и абзацы как на странице; не переставляй части и не сокращай ход рассуждений.\n"
            "4) Ничего не добавляй от себя и не переформулируй смысл; только аккуратно перепиши прочитанное текстом.\n"
            "5) Это страница решения для задачи с индексом {idx}; продолжай общий поток решения, не повторяй условие и не вставляй текст задания.\n"
            "Входной контекст (только для ориентира, не копируй его в ответ): "
            + str(task_text)
    )


def run_concurrent_requests(images, prompts, show=False,
                            show_progress=False, title="Concurrent requests"):
    results = [None] * len(prompts)  # заранее создаём список нужной длины

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(ask_llm, images[idx], prompt, show=False): idx
            for idx, prompt in enumerate(prompts)
        }
        try:
            if show_progress:
                for future in tqdm(concurrent.futures.as_completed(futures), total=len(futures), desc=title):
                    idx = futures[future]
                    try:
                        res = future.result()
                        if res:
                            results[idx] = res
                        else:
                            print(res, 'не является корректным')
                            results[idx] = None
                    except Exception as e:
                        # print(f"Error: {e}")
                        results[idx] = None
            else:
                for future in concurrent.futures.as_completed(futures):
                    idx = futures[future]
                    try:
                        res = future.result()
                        if res:
                            results[idx] = res
                        else:
                            print(res, 'не является корректным')
                            results[idx] = None
                    except Exception as e:
                        # print(f"Error: {e}")
                        results[idx] = None
        except KeyboardInterrupt:
            print("\nSTOP pressed! Cancelling pending tasks...")
            # Останавливаем всё, что ещё не стартовало
            executor.shutdown(wait=False, cancel_futures=True)
            raise  # чтобы прервать выполнение

    return results


import math
import time


def rerun_until_filled(
        images,
        prompts,
        show=False,
        show_progress=True,
        title="Concurrent requests",
        sleep=1.0  # чтобы не молотил API слишком агрессивно
):
    # Первая попытка
    results = run_concurrent_requests(
        images=images,
        prompts=prompts,
        show=show,
        show_progress=show_progress,
        title=title
    )

    iteration = 1
    for i in range(5):
        # Находим индексы с None / NaN / пустыми
        nan_idxs = [
            i for i, x in enumerate(results)
            if x is None
               or (isinstance(x, float) and math.isnan(x))
               or (isinstance(x, str) and not x.strip())
        ]

        if not nan_idxs:
            break

        # print(f"♻️ Итер {iteration}: повторный запуск для {len(nan_idxs)} NaN")

        retry_prompts = [prompts[i] for i in nan_idxs]

        retry_results = run_concurrent_requests(
            images=images,
            prompts=retry_prompts,
            show=show,
            show_progress=show_progress,
            title=f"{title} (retry {iteration})",
        )

        # Вставляем новые ответы
        for idx, val in zip(nan_idxs, retry_results):
            results[idx] = val

        iteration += 1
        time.sleep(sleep)

    nan_idxs = [
        i for i, x in enumerate(results)
        if x is None
           or (isinstance(x, float) and math.isnan(x))
           or (isinstance(x, str) and not x.strip())
    ]

    if nan_idxs:
        for idx, val in zip(nan_idxs, retry_results):
            results[idx] = "None"

    return results


from PIL import Image, UnidentifiedImageError


class TaskRecognizer:
    def __init__(self):
        self.all_prompts = []
        self.all_images = []
        self.index_ranges = []

    def add_task(self, task_text: str, file_path: str, dpi: int = 200):
        """
        Добавляет задачу для распознавания.
        Если file_path — PDF, конвертирует в изображения.
        Если картинка — открывает напрямую.
        Если .txt — читает текст напрямую.
        Возвращает 'Неверный формат файла', если открыть картинку не удалось.
        """
        start_idx = len(self.all_prompts)

        # Обработка .txt файлов
        if file_path.lower().endswith(".txt"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text_content = f.read()
                # Для txt файлов сразу сохраняем текст, без OCR
                self.all_prompts.append("")  # Пустой промпт, не используется
                self.all_images.append(None)  # Нет изображения
                # Сохраняем текст напрямую
                if not hasattr(self, 'txt_results'):
                    self.txt_results = {}
                self.txt_results[start_idx] = text_content
                end_idx = start_idx
                self.index_ranges.append((start_idx, end_idx))
                return "Добавлено успешно"
            except Exception as e:
                return "Неверный формат файла"

        if file_path.lower().endswith(".pdf"):
            images = pdf_to_images(file_path, dpi=dpi)
        else:
            try:
                img = Image.open(file_path).convert("RGB")
                images = [img]
            except (UnidentifiedImageError, OSError):
                return "Неверный формат файла"

        for img in images:
            prompt = build_prompt(task_text)
            self.all_prompts.append(prompt)
            self.all_images.append(img)

        end_idx = len(self.all_prompts) - 1
        self.index_ranges.append((start_idx, end_idx))
        return "Добавлено успешно"

    def run_recognition(self, title="Распознаем текст"):
        """
        Запускает распознавание всех добавленных изображений.
        Для .txt файлов пропускает OCR.
        """
        # Фильтруем только изображения (не txt файлы)
        images_to_process = []
        prompts_to_process = []
        image_indices = []

        for idx, img in enumerate(self.all_images):
            if img is not None:  # Не txt файл
                images_to_process.append(img)
                prompts_to_process.append(self.all_prompts[idx])
                image_indices.append(idx)

        if not images_to_process and not hasattr(self, 'txt_results'):
            return "Нет изображений для распознавания"

        # Инициализируем results списком None
        self.results = [None] * len(self.all_prompts)

        # Если есть txt файлы, сразу добавляем их результаты
        if hasattr(self, 'txt_results'):
            for idx, text in self.txt_results.items():
                self.results[idx] = text

        # Обрабатываем изображения через OCR
        if images_to_process:
            ocr_results = rerun_until_filled(
                images_to_process,
                prompts_to_process,
                title=title
            )
            # Заполняем результаты для изображений
            for i, idx in enumerate(image_indices):
                self.results[idx] = ocr_results[i]

        return "Распознавание завершено"

    def get_task_texts(self):
        """
        Возвращает распознанный текст для каждой задачи.
        """
        if not hasattr(self, "results"):
            return "Сначала нужно вызвать run_recognition()"

        records = []
        for start, end in self.index_ranges:
            page_texts = self.results[start:end + 1]
            solution_text = "\n\n".join([t for t in page_texts if t])
            records.append(solution_text)
        return records


if __name__ == '__main__':
    recognizer = TaskRecognizer()

    res1 = recognizer.add_task("Задача с PDF", "2.pdf")
    print(res1)  # Добавлено успешно

    res2 = recognizer.add_task("Задача с PDF", "2.pdf")
    print(res2)  # Добавлено успешно или 'Неверный формат файла'

    res3 = recognizer.add_task("Задача с PDF", "2.pdf")
    print(res3)  # 'Неверный формат файла'

    recognizer.run_recognition()

    for i, text in enumerate(recognizer.get_task_texts()):
        print(f"=== Задача {i + 1} ===")
        print(text)
