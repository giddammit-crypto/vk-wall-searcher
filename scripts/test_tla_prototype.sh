#!/usr/bin/env bash
# ==============================================================================
# THE LAST ARCHIVE — PoC: проверки прототипа из game/tla
#   1. Синтаксис всех модулей и тестов (node --check)
#   2. Headless-тесты игровых систем (акустика, LOS/FSM, уровень, книги, сейв)
#   3. Дымовой прогон браузерного слоя (реальный класс Game на стабе DOM)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."
TLA_DIR="${PROJECT_ROOT}/game/tla"

echo "======================================================================"
echo "  THE LAST ARCHIVE — PoC: АКУСТИКА / ЗРЕНИЕ / FSM / СЕЙВ"
echo "======================================================================"
echo "Каталог прототипа: ${TLA_DIR}"
echo ""

echo "[1/3] node --check"
FAIL=0
while IFS= read -r f; do
  if node --check "${f}" 2>/dev/null; then
    echo "  [PASS] ${f#"${PROJECT_ROOT}/"}"
  else
    echo "  [FAIL] ${f#"${PROJECT_ROOT}/"}"
    FAIL=1
  fi
done < <(find "${TLA_DIR}" \( -name "*.js" -o -name "*.mjs" \) | sort)
if [ ${FAIL} -ne 0 ]; then
  echo "Синтаксические ошибки в модулях прототипа."
  exit 1
fi
echo ""

echo "[2/3] Headless-тесты игровых систем"
node "${TLA_DIR}/test/core.test.mjs"
echo ""

echo "[3/3] Дымовой прогон браузерного слоя"
node "${TLA_DIR}/test/smoke.test.mjs"
echo ""

echo "======================================================================"
echo "  ПРОТОТИП THE LAST ARCHIVE: ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ"
echo "======================================================================"
