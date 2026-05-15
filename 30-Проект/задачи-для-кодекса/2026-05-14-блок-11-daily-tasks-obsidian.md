---
created: '2026-05-14'
start: 2026-05-14
due: 2026-05-14
type: задача-для-кодекса
блок: 11
status: выполнена
зависит-от: []
---

# Блок 11. Daily Task Workflow в Obsidian

**Источник:** Запрос пользователя 2026-05-14 — настроить ежедневный фокус по задачам проекта.

## Контекст

Задачи проекта nika-sable разбросаны по заметкам vault'а, нет единого ежедневного фокуса. Нужно: при открытии Obsidian утром автоматически создаётся daily note, в которой агрегированы актуальные задачи с приоритизацией. Стек: плагины Tasks + Templater + Daily Notes (core).

## Что сделать

- [x] Создать папку `Daily/` в корне vault (если отсутствует).
- [x] Создать папку `Templates/` в корне vault (если отсутствует).
- [x] Создать шаблон `Templates/daily-note.md` (содержимое — ниже в разделе «Шаблоны»).
- [x] Создать сниппет `Templates/task-snippet.md` для быстрой вставки новой задачи.
- [x] Создать файл `.obsidian/daily-notes.json` с параметрами: folder=`Daily`, format=`YYYY-MM-DD`, template=`Templates/daily-note`, autorun=`true`.
- [x] Проверить/обновить `.gitignore`: добавить исключения `.obsidian/workspace*`, `.obsidian/cache`, `.obsidian/graph.json`, `.trash/` — если их нет.
- [x] Создать `30-Проект/задачи/blockers.md` со структурой из раздела «Шаблоны» (если файл уже есть — не трогать).
- [x] Добавить в `30-Проект/задачи/backlog.md` (или создать, если нет) 5 тестовых задач с тегом `#nika`, разными датами и приоритетами для проверки запросов.
- [x] Убедиться, что плагины `obsidian-tasks-plugin` и `templater-obsidian` перечислены в `.obsidian/community-plugins.json`.

## Шаблоны

### `Templates/daily-note.md`

````
---
date: <% tp.date.now("YYYY-MM-DD") %>
project: nika-sable
tags: [daily, nika]
---

# <% tp.date.now("dddd, D MMMM YYYY") %>

> Вчера: [[<% tp.date.now("YYYY-MM-DD", -1) %>]] · Завтра: [[<% tp.date.now("YYYY-MM-DD", 1) %>]]

## 🎯 Фокус дня (3 главных)

1. 
2. 
3. 

## 🔥 На сегодня

```tasks
not done
(due on or before today) OR (scheduled on or before today)
tags include #nika
sort by priority, due
limit 10
```

## ⚠️ Просрочено

```tasks
not done
due before today
tags include #nika
sort by due
```

## 📌 Бэклог (high priority, без даты)

```tasks
not done
no due date
priority is high
tags include #nika
limit 5
```

## 🚧 Блокеры

![[30-Проект/задачи/blockers#^active]]

## 📝 Заметки дня



## ✅ Итоги дня

- Сделано:
- Перенесено:
- Выводы:
````

### `Templates/task-snippet.md`

````
- [ ] <% tp.file.cursor() %> #nika 📅 <% tp.date.now("YYYY-MM-DD") %> 🔼
````

### `30-Проект/задачи/blockers.md` (только если файла нет)

````
---
tags: [nika, blockers]
---

# Блокеры

## Активные ^active

## Разобранные
````

## Настройка плагина Tasks (инструкция для пользователя, не для Codex)

После применения задачи пользователь вручную выставляет в настройках Tasks:
- Global filter: `#nika`
- Set done date on completion: on

## Соглашение по задачам

Все задачи проекта **обязательно** содержат тег `#nika`.

Приоритеты:
- 🔺 highest — блокирует других
- ⏫ high — нужно в этом спринте
- 🔼 medium — важно, но терпит
- 🔽 low — когда-нибудь

Даты:
- `📅` — due date (дедлайн)
- `⏳` — scheduled (планирую делать)
- `🛫` — start date

## Критерий готовности

При открытии `Daily/YYYY-MM-DD.md` (созданного по шаблону) тестовые задачи с тегом `#nika` корректно распределяются по трём разделам: «На сегодня», «Просрочено», «Бэклог».

## Запреты

- Не трогать существующие заметки в `30-Проект/задачи/` — только создавать `blockers.md` если его нет.
- Не менять структуру папок `.agents/`, `.claude/`, `20-Заметки/`, `10-Источники/`.
- Не коммитить `.obsidian/workspace*` и кеш.

## Отчёт Кодекса

Выполнено 2026-05-14:

- Созданы папки `Daily/`, `Templates/`, `30-Проект/задачи/`.
- Созданы шаблоны `Templates/daily-note.md` и `Templates/task-snippet.md`.
- Создана настройка daily notes `.obsidian/daily-notes.json`.
- Создан список community plugins `.obsidian/community-plugins.json` с `obsidian-tasks-plugin` и `templater-obsidian`.
- Созданы `30-Проект/задачи/blockers.md` и `30-Проект/задачи/backlog.md` с 5 тестовыми задачами `#nika`.
- В `.gitignore` добавлены исключения для workspace/cache/graph/trash Obsidian.

Проверка: JSON-файлы валидны, нужные файлы и папки существуют.

Дополнено после проверки в Obsidian:

- Создана сегодняшняя заметка `Daily/2026-05-14.md`.
- Установлены community-плагины в `.obsidian/plugins/`: `obsidian-tasks-plugin` 8.0.0 и `templater-obsidian` 2.20.4.
- Плагины перечислены в `.obsidian/community-plugins.json`; для фактической загрузки может потребоваться перезапуск Obsidian или Reload app.
- Добавлены настройки плагинов: Tasks `globalFilter: #nika`, `setDoneDate: true`; Templater `templates_folder: Templates`, folder template для `Daily`.
