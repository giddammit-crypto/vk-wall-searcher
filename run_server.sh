#!/bin/bash
# ==============================================================================
#   Статистика групп ВК (Разработка Амброзиев О.А.) — Локальный PHP Сервер
#   ВНИМАНИЕ: Скрипт нужен ТОЛЬКО для локального запуска на вашем компьютере!
#   На веб-хостинге (Apache/Nginx/cPanel/Beget) запускать его НЕ НУЖНО.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export PATH="$HOME/.local/bin:$PATH"

PORT=8000
HOST="0.0.0.0"

# Check if PHP is installed
if ! command -v php >/dev/null 2>&1; then
    echo "❌ Ошибка: PHP не найден в системе. Установите PHP 7.4 или новее."
    exit 1
fi

# Release port 8000 if occupied by another process (e.g. old python/fastapi server)
if command -v fuser >/dev/null 2>&1; then
    if fuser 8000/tcp >/dev/null 2>&1; then
        echo "⚠️ Порт 8000 занят. Завершаем старый процесс..."
        fuser -k 8000/tcp >/dev/null 2>&1
        sleep 1
    fi
fi

echo "=================================================================="
echo "🚀 Запуск PHP сервера: Статистика групп ВК"
echo "   Адрес: http://localhost:$PORT"
echo "   Разработка: Амброзиев О.А."
echo "=================================================================="

# Open browser in background after 1 second
(
    sleep 1
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "http://localhost:$PORT" >/dev/null 2>&1
    elif command -v open >/dev/null 2>&1; then
        open "http://localhost:$PORT" >/dev/null 2>&1
    fi
) &

# Run PHP built-in web server
php -S "${HOST}:${PORT}"
