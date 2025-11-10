# Решение проблем с запуском проекта

## ✅ Текущий статус
Проект успешно запускается командой `npm run start` и доступен на `http://localhost:4200/`

## Возможные проблемы и решения

### 0. Видно только текст "Prime Auto Hub server is running" вместо фронтенда

**Симптомы:**
При запуске `npm run start` вместо Angular приложения показывается только текст "Prime Auto Hub server is running"

**Причина:**
Запускается SSR сервер вместо dev-сервера, или проблемный маршрут в server.ts перехватывает запросы

**Решение:**
✅ **Исправлено!** Проблема была в двух местах:
1. В `server.ts` был маршрут `/`, который возвращал текст - удален
2. В `angular.json` SSR был включен для development - отключен

Теперь проект запускается в режиме браузера без SSR для разработки.

**Если проблема осталась:**
```bash
# Очистить кеш и перезапустить
rm -rf .angular dist
npm run start
```

### 1. Порт 4200 занят

**Симптомы:**
```
Error: Port 4200 is already in use
```

**Решение:**
```bash
# Вариант 1: Использовать другой порт
npm run start -- --port 4201

# Вариант 2: Освободить порт
lsof -ti:4200 | xargs kill -9

# Вариант 3: Указать порт в angular.json
# Добавить в serve.options: "port": 4201
```

### 2. Зависимости не установлены

**Симптомы:**
```
Cannot find module '@angular/core'
```

**Решение:**
```bash
# Удалить node_modules и package-lock.json
rm -rf node_modules package-lock.json

# Переустановить зависимости
npm install
```

### 3. Проблемы с Angular CLI

**Симптомы:**
```
ng: command not found
```

**Решение:**
```bash
# Использовать локальную версию через npx
npx ng serve

# Или установить глобально
npm install -g @angular/cli@20.1.4
```

### 4. Проблемы с TypeScript

**Симптомы:**
```
Type errors found
```

**Решение:**
```bash
# Проверить версию TypeScript
npm list typescript

# Обновить TypeScript
npm install --save-dev typescript@~5.8.2
```

### 5. Проблемы с памятью Node.js

**Симптомы:**
```
JavaScript heap out of memory
```

**Решение:**
```bash
# Увеличить лимит памяти
export NODE_OPTIONS="--max-old-space-size=4096"
npm run start
```

### 6. Проблемы с кешем

**Симптомы:**
Странные ошибки компиляции, несоответствия версий

**Решение:**
```bash
# Очистить кеш Angular
rm -rf .angular

# Очистить кеш npm
npm cache clean --force

# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install
```

### 7. Проблемы с SSR конфигурацией

**Симптомы:**
Ошибки при сборке server bundles

**Решение:**
```bash
# Проверить наличие всех необходимых файлов
ls -la src/main.server.ts
ls -la src/server.ts

# Если файлы отсутствуют, создать их или отключить SSR временно
# В angular.json убрать "server" и "ssr" опции
```

### 8. Проблемы с правами доступа

**Симптомы:**
```
EACCES: permission denied
```

**Решение:**
```bash
# Исправить права доступа
sudo chown -R $(whoami) node_modules
sudo chown -R $(whoami) .angular
```

## Полезные команды для диагностики

```bash
# Проверить версии
node --version
npm --version
npx ng version

# Проверить занятость порта
lsof -ti:4200

# Проверить установленные зависимости
npm list --depth=0

# Проверить ошибки компиляции
npm run build

# Запустить с подробным выводом
npm run start -- --verbose
```

## Альтернативные способы запуска

### Запуск без SSR (только клиент)
```bash
# Временно отключить SSR в angular.json
# Затем запустить
npm run start
```

### Запуск production сборки локально
```bash
npm run build:ssr
npm run start:prod
```

### Запуск с кастомным портом и хостом
```bash
npm run start -- --port 4300 --host 0.0.0.0
```

## Конфигурация для разработки

Если проблемы продолжаются, проверьте:

1. **angular.json** - правильность путей и конфигурации
2. **tsconfig.json** - настройки TypeScript
3. **package.json** - версии зависимостей
4. **src/environments/environment.ts** - переменные окружения

## Контакты для помощи

Если проблема не решается:
1. Проверьте логи ошибок полностью
2. Убедитесь, что используете правильную версию Node.js (рекомендуется v18+)
3. Проверьте, что все файлы проекта на месте
4. Попробуйте запустить на чистой системе

