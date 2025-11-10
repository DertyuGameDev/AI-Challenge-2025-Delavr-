[team2prime] Delavr
## MathSolver
Чтобы запустить приложение через `docker compose` необходимо:
САМОЕ ГЛАВНОЕ!
Перед запуском программы пожалуйста введите свои ключи в файле `.env`:

```
MODEL1=Qwen/Qwen3-4B-Thinking-2507  
MODEL2=Qwen/Qwen3-4B-Instruct-2507  
MODEL3=google/gemini-2.5-flash  
TOKEN1=...
TOKEN2=...
```

Затем:

1. Запустить Docker Desktop
2. Зайти с помощью команды `cd` из командной строки в папку с репозиторием
3. Написать `docker compose up` в консоли
4. Нажать на localhost:8081 в вкладке `Containers`

