FROM python:3.13-alpine

WORKDIR /app

# Устанавливаем системные зависимости для Python пакетов
RUN apk add --no-cache \
    gcc \
    musl-dev \
    jpeg-dev \
    zlib-dev \
    freetype-dev \
    lcms2-dev \
    openjpeg-dev \
    tiff-dev \
    tk-dev \
    tcl-dev \
    harfbuzz-dev \
    fribidi-dev \
    libimagequant-dev \
    libxcb-dev \
    libpng-dev \
    mupdf-dev \
    mupdf-tools

# Копируем requirements.txt и устанавливаем зависимости
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем backend файлы
COPY backend/ /app/backend/

# Копируем frontend файлы
COPY frontend/ /app/frontend/

# Создаем директорию для data если её нет
RUN mkdir -p /app/data

# Открываем порт
EXPOSE 8081

# Устанавливаем PYTHONPATH для корректных импортов
ENV PYTHONPATH=/app

# Запускаем Flask приложение из корня проекта
CMD ["python3", "backend/main.py"]

