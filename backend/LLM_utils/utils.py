import math
import os
from LLM_utils.promts import *
from openai import OpenAI
import httpx
import time
from concurrent.futures import ThreadPoolExecutor
from tqdm import tqdm
import concurrent.futures
import re
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(ENV_PATH)

nscale_service_token1 = os.environ.get('TOKEN1', '')
OPENROUTER_KEY = os.environ.get('TOKEN2', '')
nscale_base_url = "https://inference.api.nscale.com/v1"
OPENROUTER_URL = "https://openrouter.ai/api/v1"

client = OpenAI(
    base_url=OPENROUTER_URL,
    api_key=OPENROUTER_KEY,
)

client1 = OpenAI(
    base_url=nscale_base_url,
    api_key=nscale_service_token1,
)


def make_prompts(task, steps, solution, batch_size):
    """Разбивает шаги на чанки и собирает промты."""
    prompts = []
    for k in range(0, len(steps), batch_size):
        chunk = steps[k:k + batch_size]
        chunk_str = '\n'.join(f"{i + 1}. {s}" for i, s in enumerate(chunk, start=k))
        p = PROMPT_MARK_ERRORS_TOKEN_WITH_REFERENCE \
            .replace('{TASK}', task) \
            .replace('{STEPS}', chunk_str) \
            .replace('{REFERENCE}', solution)
        prompts.append(p)
    return prompts


def ask_llm(task, model_name, max_retries=3, show=True):
    def get_response_after_think(text):
        split_tag = "</think>"
        parts = text.split(split_tag, 1)
        if len(parts) > 1:
            return parts[1].strip()
        else:
            return None

    while True:
        if 'qwen' in model_name.lower():
            response = client1.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "user", "content": task}
                ], temperature=0.6, top_p=0.95, max_tokens=240_000
            )

            if 'thinking' in model_name.lower():
                result = get_response_after_think(response.choices[0].message.content)
            else:
                result = response.choices[0].message.content

            if show:
                # display(Markdown(result))
                print('-' * 80)
            if result:
                return result
        else:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": task}
                        ]
                    }
                ]
            )
            result = response.choices[0].message.content

            if result:
                return result


def decompose_contin(text, task, model_name):
    retry = 0
    model_name = model_name.replace('Thinking', 'Instruct')
    for i in range(10):
        if retry >= 3:
            model_name = model_name.replace('Instruct', 'Thinking')
            # print('переход к более тяжелой модели')
        res = ask_llm(
            task,
            model_name,
            show=False
        )

        steps = list(map(lambda x: x[1:-1], re.findall(r'\d+\.\s(.*?)(?=\n\d+\.|$)', res, flags=re.S)))
        # print(steps)
        # for l1 in steps:
        #     while l1[0] == '"':
        #         l1 = l1[1:]
        #     while l1[-1] == '"':
        #         l1 = l1[:-1]
        print(steps)
        text = text.replace('\n', '  ')
        not_found = [s for s in steps if text.find(s) == -1]
        print(res)
        print(not_found)
        if not_found:
            retry += 1
            continue
        else:
            break
    if retry == 10: print('не удалось разбить на шаги, выкинуто', (len(not_found)))
    return {s: text.find(s) for s in steps if text.find(s) != -1}


def inference(model_name, prompts=None, show=False,
              show_progress=False, title="Concurrent requests", texts_for_decompose=None):
    import time
    results = [None] * len(prompts)  # заранее создаём список нужной длины

    # Добавляем задержку перед началом обработки для снижения нагрузки
    if len(prompts) > 0:
        time.sleep(0.5)  # Небольшая задержка перед началом

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:  # Уменьшили количество воркеров
        if not texts_for_decompose:
            futures = {
                executor.submit(ask_llm, prompt, model_name, show=False): idx
                for idx, prompt in enumerate(prompts)
            }
        else:
            futures = {
                executor.submit(decompose_contin, texts_for_decompose[idx], prompt, model_name): idx
                for idx, prompt in enumerate(prompts)
            }
        try:
            if show_progress:
                for future in tqdm(concurrent.futures.as_completed(futures), total=len(futures), desc=title):
                    idx = futures[future]
                    try:
                        res = future.result()
                        if res:
                            if show:
                                # display(Markdown(res))
                                pass
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
                            if show:
                                # display(Markdown(res))
                                pass
                            results[idx] = res
                        else:
                            print(res, 'не является корректным')
                            results[idx] = None
                    except Exception as e:
                        # print(f"Error: {e}")
                        results[idx] = None
        # except KeyboardInterrupt:
        #     print("\nSTOP pressed! Cancelling pending tasks...")
        #     # Останавливаем всё, что ещё не стартовало
        #     executor.shutdown(wait=False, cancel_futures=True)
        #     raise  # чтобы прервать выполнение
        except Exception as e:
            print(e)

    return results


def rerun_until_filled(
        model_name,
        prompts,
        texts_for_decompose=None,
        show=False,
        show_progress=True,
        title="Concurrent requests",
        sleep=3.0  # увеличили задержку между запросами для снижения нагрузки
):
    """
    Функция для запроса к модели с повторными попытками.
    
    ЗАЧЕМ НУЖНЫ ПОПЫТКИ (retry):
    - Модель иногда возвращает None, пустую строку или NaN вместо ответа
    - Это может происходить из-за ошибок API, таймаутов или некорректных ответов модели
    - Повторные попытки позволяют получить валидный ответ вместо пустого результата
    - Уменьшили количество попыток с 5 до 2 для ускорения процесса
    """
    # Первая попытка
    results = inference(
        model_name=model_name,
        prompts=prompts,
        show=show,
        show_progress=show_progress,
        title=title,
        texts_for_decompose=texts_for_decompose
    )

    iteration = 1
    # Уменьшили количество попыток с 5 до 2 для ускорения процесса
    # Попытки нужны только для обработки случаев, когда модель вернула None/пустой ответ
    for i in range(2):
        # Находим индексы с None / NaN / пустыми
        nan_idxs = [
            i for i, x in enumerate(results)
            if x is None
               or (isinstance(x, float) and math.isnan(x))
               or (isinstance(x, str) and not x.strip())
        ]

        if not nan_idxs:
            break

        print(f"♻️ Retry {iteration}: повторный запрос для {len(nan_idxs)} пустых ответов")

        retry_prompts = [prompts[i] for i in nan_idxs]
        if texts_for_decompose: retry_texts = [texts_for_decompose[i] for i in nan_idxs]

        retry_results = inference(
            model_name=model_name,
            prompts=retry_prompts,
            show=show,
            show_progress=show_progress,
            title=f"{title} (retry {iteration})",
            texts_for_decompose=retry_texts if texts_for_decompose else None
        )

        # Вставляем новые ответы
        for idx, val in zip(nan_idxs, retry_results):
            results[idx] = val

        iteration += 1
        if sleep > 0:
            time.sleep(sleep)  # Задержка между повторными попытками

    # Финальная проверка - если остались пустые ответы после всех попыток, заменяем на "None"
    nan_idxs = [
        i for i, x in enumerate(results)
        if x is None
           or (isinstance(x, float) and math.isnan(x))
           or (isinstance(x, str) and not x.strip())
    ]

    if nan_idxs:
        print(f"⚠️ После всех попыток осталось {len(nan_idxs)} пустых ответов, заменяем на 'None'")
        for idx in nan_idxs:
            results[idx] = "None"

    return results


def errors(indexes, steps):
    dia = []
    for x1, i in zip(steps, indexes):
        d = []
        x = x1
        starts = None
        while x.find('[ERROR]') != -1:
            f = x.find('[ERROR]')
            if not starts:
                starts = f
            else:
                d.append([starts - 1, f + 1, x.replace('[ERROR]', '', 1)])
                starts = None
            x = x.replace('[ERROR]', '', 1)
        dia.append(d)
    return dia


def extract(ans_steps, indexes, solution):
    pattern = r'\d+\.\s(.*?)(?=\n\d+\.|$)'
    ans = []
    for i, j in zip(errors(indexes, ans_steps), indexes):
        if not i:
            continue
        for t in i:
            char = t[2][t[0]:t[1]]
            p = len(char)
            n = 0
            while solution[j:].find(char) == -1:
                if n % 2 == 0:
                    char = char[:-1]
                elif n % 2 != 0:
                    char = char[1:]
                if len(char) <= 1:
                    break
                n += 1
            if len(char) < 1:
                continue
            start = solution[j:].find(char) + 1
            if [j + start, j + start + p - 2] not in ans:
                ans.append([j + start, j + start + p - 2])
    return ans
