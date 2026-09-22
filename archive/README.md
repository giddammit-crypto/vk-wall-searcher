# Архивы модулей электронного каталога OPAC-Global

Данная директория содержит полные резервные архивы модуля поиска по электронному каталогу OPAC-Global для трёх платформ экосистемы «АВРОРА»:

| Архив | Платформа | Описание |
|---|---|---|
| `opac-wordpress-plugin.zip` | WordPress (Плагин) | Полнофункциональный плагин для WordPress 5.8+ (совместим с PHP 7.1–8.4+), с модальным окном, обложками, шорткодом `[opac_catalog]` и настройками |
| `opac-aurora-site.zip` | Сайт «АВРОРА» (Web) | Серверный шлюз `api/opac.php`, клиент `api/OpacClient.php`, ES6-модуль `src/opac_modal.js`, стили `src/opac_search.css`, векторные ассеты и спецификация |
| `opac-vk-miniapp.zip` | VK Mini App (Космо) | HTML-разметка экрана каталога, JavaScript логика поиска и рендеринга, CSS стили и чипы подсказок |

---

## 1. Восстановление плагина для WordPress
Файл `opac-wordpress-plugin.zip` готов к установке через стандартную панель WordPress:
- Админка WordPress → **Плагины** → **Добавить новый** → **Загрузить плагин** → выбрать `opac-wordpress-plugin.zip` → **Активировать**.

## 2. Восстановление модуля на сайте «Аврора»
1. Распаковать `opac-aurora-site.zip` в корень проекта `vk-wall-searcher/`:
   ```bash
   unzip -o archive/opac-aurora-site.zip -d .
   ```
2. Подключить стили в `index.html`:
   ```html
   <link rel="stylesheet" href="src/opac_search.css?v=4.61.0">
   ```
3. Подключить инициализацию модального окна в `src/app.js`:
   ```javascript
   import { initOpacModal, openOpacModal } from './opac_modal.js';
   initOpacModal();
   ```

## 3. Восстановление модуля в VK Mini App
1. Распаковать `opac-vk-miniapp.zip`.
2. Вставить разметку из `opac-catalog-screen.html` в `vk-miniapp/index.html`.
3. Добавить функции из `opac-catalog.js` в `vk-miniapp/app.js`.
4. Добавить стили из `opac-catalog.css` в `vk-miniapp/style.css`.
