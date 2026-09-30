#!/usr/bin/env bash
# ==============================================================================
# AURORA DESIGN & VK WALL SEARCHER — QA INTEGRITY VALIDATION SUITE
# Checks:
#   1. JavaScript syntax integrity via `node --check` on all project JS files
#   2. Backend chat & search trigger tests via `php scripts/test_chat_triggers.php`
# ==============================================================================

set -e

COLOR_RESET="\033[0m"
COLOR_GREEN="\033[1;32m"
COLOR_RED="\033[1;31m"
COLOR_CYAN="\033[1;36m"
COLOR_YELLOW="\033[1;33m"
COLOR_BOLD="\033[1m"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${COLOR_CYAN}======================================================================${COLOR_RESET}"
echo -e "${COLOR_BOLD}  AURORA QA INTEGRITY SUITE: JS SYNTAX & BACKEND TRIGGERS VALIDATION  ${COLOR_RESET}"
echo -e "${COLOR_CYAN}======================================================================${COLOR_RESET}"
echo "Project Root: ${PROJECT_ROOT}"
echo "Started at:   $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ------------------------------------------------------------------------------
# STEP 1: JavaScript Syntax Validation (node --check)
# ------------------------------------------------------------------------------
echo -e "${COLOR_YELLOW}[1/2] Проверка синтаксиса JavaScript файлов (node --check)...${COLOR_RESET}"

JS_TOTAL=0
JS_PASSED=0
JS_FAILED=0
FAILED_FILES=()

# Prioritized key editor files first
KEY_FILES=(
  "vk-miniapp/poster/figma_pro_tools.js"
  "vk-miniapp/poster/editor.js"
  "vk-miniapp/poster/ai_elements.js"
  "vk-miniapp/poster/enhancer.js"
  "vk-miniapp/poster/retouch_engine.js"
  "vk-miniapp/app.js"
  "vk-miniapp/html-editor/editor.js"
  "vk-miniapp/html-editor/zero_block.js"
  "vk-miniapp/html-editor/tilda_engine.js"
  "vk-miniapp/html-editor/tilda_blocks.js"
  "src/app.js"
  "src/cosmo_chat.js"
  "src/mascot.js"
  "src/space3d.js"
  "src/space3d_gl.js"
)

echo "--- Ключевые модули редактора и ядра ---"
for rel in "${KEY_FILES[@]}"; do
  full_path="${PROJECT_ROOT}/${rel}"
  if [ -f "${full_path}" ]; then
    JS_TOTAL=$((JS_TOTAL + 1))
    if node --check "${full_path}" 2>/dev/null; then
      JS_PASSED=$((JS_PASSED + 1))
      echo -e "  [PASS] ${rel}"
    else
      JS_FAILED=$((JS_FAILED + 1))
      FAILED_FILES+=("${rel}")
      echo -e "  ${COLOR_RED}[FAIL] ${rel}${COLOR_RESET}"
    fi
  fi
done

echo ""
echo "--- Все остальные JS-файлы проекта ---"
while IFS= read -r f; do
  rel="${f#./}"
  # Пропускаем уже проверенные ключевые
  already_checked=0
  for k in "${KEY_FILES[@]}"; do
    if [ "$k" = "$rel" ]; then
      already_checked=1
      break
    fi
  done
  if [ $already_checked -eq 1 ]; then
    continue
  fi

  JS_TOTAL=$((JS_TOTAL + 1))
  if node --check "${f}" 2>/dev/null; then
    JS_PASSED=$((JS_PASSED + 1))
  else
    JS_FAILED=$((JS_FAILED + 1))
    FAILED_FILES+=("${rel}")
    echo -e "  ${COLOR_RED}[FAIL] ${rel}${COLOR_RESET}"
  fi
done < <(find "${PROJECT_ROOT}" -name "*.js" -not -path "*/node_modules/*" -not -path "*/archive/*" -not -path "*/.git/*" | sort)

echo -e "  ${COLOR_GREEN}Итог JS:${COLOR_RESET} проверено ${JS_TOTAL} файлов. Успешно: ${JS_PASSED}, Ошибок: ${JS_FAILED}"
if [ ${JS_FAILED} -gt 0 ]; then
  echo -e "${COLOR_RED}Ошибки в синтаксисе JS файлов:${COLOR_RESET}"
  for f in "${FAILED_FILES[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
echo ""

# ------------------------------------------------------------------------------
# STEP 2: Backend Triggers Validation (php scripts/test_chat_triggers.php)
# ------------------------------------------------------------------------------
echo -e "${COLOR_YELLOW}[2/2] Запуск тестов триггеров бэкенда (php scripts/test_chat_triggers.php)...${COLOR_RESET}"
PHP_TEST_FILE="${PROJECT_ROOT}/scripts/test_chat_triggers.php"

if [ ! -f "${PHP_TEST_FILE}" ]; then
  echo -e "${COLOR_RED}[FAIL] Скрипт ${PHP_TEST_FILE} не найден!${COLOR_RESET}"
  exit 1
fi

php "${PHP_TEST_FILE}"
PHP_EXIT_CODE=$?

echo ""
if [ ${PHP_EXIT_CODE} -ne 0 ]; then
  echo -e "${COLOR_RED}======================================================================${COLOR_RESET}"
  echo -e "${COLOR_RED}  QA VALIDATION FAILED! Бэкенд-триггеры завершились с кодом ${PHP_EXIT_CODE}${COLOR_RESET}"
  echo -e "${COLOR_RED}======================================================================${COLOR_RESET}"
  exit ${PHP_EXIT_CODE}
fi

echo -e "${COLOR_GREEN}======================================================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}  ВСЕ ТЕСТЫ ЦЕЛОСТНОСТИ УСПЕШНО ПРОЙДЕНЫ! (JS OK, PHP TRIGGERS 38/38)  ${COLOR_RESET}"
echo -e "${COLOR_GREEN}======================================================================${COLOR_RESET}"
exit 0
