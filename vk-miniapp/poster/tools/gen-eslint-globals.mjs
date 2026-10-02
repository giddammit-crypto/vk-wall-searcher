#!/usr/bin/env node
/**
 * Генератор eslint.globals.mjs для AURORA DESIGN.
 *
 * Скрипты редактора — классические браузерные скрипты: объявленный в editor.js
 * `let currentSize` виден в enhancer.js как глобальная лексическая привязка.
 * ESLint этого не знает и режет такие места правилом no-undef, из-за чего
 * настоящие дефекты (P0-2 `getActiveBrushKind`, `syncUI`) теряются в шуме.
 *
 * Скрипт разбирает каждый файл через AST (acorn) и собирает ОБЪЯВЛЕНИЯ
 * ВЕРХНЕГО УРОВНЯ — именно они и становятся глобалами для других скриптов.
 * Тогда no-undef срабатывает только на именах, которых нет ни в одном файле,
 * то есть ровно на дефектах.
 *
 * Запуск: node tools/gen-eslint-globals.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'server', 'tools', 'tests']);
const SKIP_FILES = new Set(['qrcode.min.js', 'test-bg-removal.js', 'eslint.config.js', 'eslint.globals.mjs']);

function listJs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      out.push(...listJs(full));
    } else if (name.endsWith('.js') && !SKIP_FILES.has(name)) {
      out.push(full);
    }
  }
  return out;
}

/** Имена, объявленные на верхнем уровне Program ( = глобалы для других скриптов). */
function topLevelNames(ast) {
  const names = new Set();
  const addPattern = (node) => {
    if (!node) return;
    if (node.type === 'Identifier') names.add(node.name);
    else if (node.type === 'ObjectPattern') node.properties.forEach((p) => addPattern(p.value || p.argument));
    else if (node.type === 'ArrayPattern') node.elements.forEach(addPattern);
    else if (node.type === 'AssignmentPattern') addPattern(node.left);
    else if (node.type === 'RestElement') addPattern(node.argument);
  };

  for (const node of ast.body) {
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
        if (node.id) names.add(node.id.name);
        break;
      case 'VariableDeclaration':
        node.declarations.forEach((d) => addPattern(d.id));
        break;
      case 'ExpressionStatement': {
        // window.foo = ... — явная публикация глобала
        const e = node.expression;
        if (e.type === 'AssignmentExpression' && e.left.type === 'MemberExpression'
            && e.left.object.type === 'Identifier' && e.left.object.name === 'window'
            && e.left.property.type === 'Identifier') {
          names.add(e.left.property.name);
        }
        break;
      }
      default:
        break;
    }
  }
  return names;
}

const declared = new Map(); // name -> Set(files)
const files = listJs(root);
const parseErrors = [];

for (const file of files) {
  const rel = relative(root, file);
  const src = readFileSync(file, 'utf8');
  let ast = null;
  for (const sourceType of ['script', 'module']) {
    try {
      ast = acorn.parse(src, { ecmaVersion: 2022, sourceType, allowReturnOutsideFunction: true });
      break;
    } catch (e) {
      if (sourceType === 'module') parseErrors.push(`${rel}: ${e.message}`);
    }
  }
  if (!ast) continue;
  for (const name of topLevelNames(ast)) {
    if (!declared.has(name)) declared.set(name, new Set());
    declared.get(name).add(rel);
  }
}

const names = [...declared.keys()].sort();
const lines = [
  '/**',
  ' * СОЗДАНО АВТОМАТИЧЕСКИ — не редактировать вручную.',
  ' * Генератор: tools/gen-eslint-globals.mjs (разбор AST через acorn)',
  ' *',
  ' * Кросс-файловые глобалы классических скриптов редактора (editor.js ↔',
  ' * enhancer.js ↔ figma_pro_tools.js ↔ inline-скрипты index.html): объявления',
  ' * верхнего уровня одного файла видны остальным как глобальные привязки.',
  ' * Список нужен, чтобы ESLint no-undef ловил только реально отсутствующие имена',
  ' * (класс дефектов P0-2/P0-3), а не легальные кросс-файловые ссылки.',
  ' */',
  'export const PROJECT_GLOBALS = {',
];
for (const n of names) {
  const key = /^[A-Za-z_$][\w$]*$/.test(n) ? n : `'${n}'`;
  lines.push(`  ${key}: 'readonly', // ${[...declared.get(n)].join(', ')}`);
}
lines.push('};', '');
writeFileSync(join(root, 'eslint.globals.mjs'), lines.join('\n'), 'utf8');
console.log(`eslint.globals.mjs: ${names.length} глобалов верхнего уровня из ${files.length} файлов.`);
if (parseErrors.length) {
  console.error('Не разобрано (требуется внимание):');
  parseErrors.forEach((e) => console.error('  - ' + e));
  process.exitCode = 1;
}
