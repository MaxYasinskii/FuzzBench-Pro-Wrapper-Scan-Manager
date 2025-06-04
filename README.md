# FuzzBranch Scanner

Комплексная платформа для генерации fuzzing-оберток и сканирования безопасности с поддержкой множественных языков программирования и продвинутым управлением ролями.

## 🏗️ Архитектура

**Гибридная архитектура:**
- **Веб-приложение**: React frontend + Express.js backend
- **База данных**: PostgreSQL  
- **Инструменты безопасности**: Установка и выполнение через Python скрипты
- **Хранение данных**: Проекты и результаты сканирования в `/home/$USER/fuzzbench-data/`

## 📁 Структура проекта

```
fuzzbranch-scanner/
├── client/                          # React frontend приложение
│   ├── src/
│   │   ├── components/             # React компоненты
│   │   │   ├── ui/                # UI компоненты (shadcn/ui)
│   │   │   ├── ConfigureToolModal.tsx    # Модальное окно конфигурации инструментов
│   │   │   ├── FuzzingWrapperGenerator.tsx # Генератор fuzzing оберток
│   │   │   ├── InstallToolModal.tsx      # Модальное окно установки инструментов
│   │   │   ├── NewProjectModal.tsx       # Создание нового проекта
│   │   │   ├── NewScanModal.tsx          # Новое сканирование
│   │   │   ├── RoleSwitcher.tsx          # Переключатель ролей
│   │   │   ├── RunToolModal.tsx          # Запуск инструментов
│   │   │   ├── Sidebar.tsx               # Боковая панель навигации
│   │   │   ├── TerminalModal.tsx         # Терминал в реальном времени
│   │   │   └── UserManagement.tsx        # Управление пользователями
│   │   ├── hooks/                  # React хуки
│   │   │   ├── useAuth.ts         # Хук аутентификации
│   │   │   └── use-toast.ts       # Хук уведомлений
│   │   ├── lib/                   # Утилиты и конфигурация
│   │   │   ├── queryClient.ts     # React Query клиент
│   │   │   └── utils.ts           # Вспомогательные функции
│   │   ├── pages/                 # Страницы приложения
│   │   │   ├── Dashboard.tsx      # Главная панель
│   │   │   ├── Landing.tsx        # Посадочная страница
│   │   │   ├── Login.tsx          # Страница входа
│   │   │   └── not-found.tsx      # 404 страница
│   │   ├── App.tsx               # Основной компонент приложения
│   │   ├── index.css             # Глобальные стили
│   │   └── main.tsx              # Точка входа React
│   └── index.html                # HTML шаблон
├── server/                          # Express.js backend
│   ├── database-storage.ts         # Хранилище данных в PostgreSQL
│   ├── db.ts                      # Конфигурация базы данных (Drizzle ORM)
│   ├── index.ts                   # Основной сервер Express
│   ├── migrate.ts                 # Скрипт миграций базы данных
│   ├── routes.ts                  # API маршруты
│   ├── storage.ts                 # Интерфейс хранилища
│   ├── types.ts                   # TypeScript типы
│   └── vite.ts                    # Конфигурация Vite для разработки
├── shared/                          # Общие типы и схемы
│   └── schema.ts                  # Zod схемы для валидации
├── scripts/                         # Скрипты инструментов безопасности
│   ├── host-tool-manager.py       # Менеджер инструментов на хосте
│   ├── pyfuzz_gen.py             # Генератор Python fuzzing оберток
│   ├── simple-tool-manager.py     # Простой менеджер инструментов
│   └── transform.py              # AFL Ruby трансформер
├── drizzle/                         # Миграции базы данных
│   └── migrations/               # SQL миграции
│       ├── meta/                 # Метаданные миграций
│       └── 0000_long_captain_flint.sql # Основная миграция
├── .env.example                     # Пример переменных окружения (разработка)
├── .env.example2                    # Пример переменных окружения (production)
├── docker-compose.yml               # Docker Compose конфигурация
├── Dockerfile                       # Docker образ приложения
├── package.json                     # Node.js зависимости и скрипты
├── drizzle.config.ts               # Конфигурация Drizzle ORM
├── tailwind.config.ts              # Конфигурация Tailwind CSS
├── tsconfig.json                   # TypeScript конфигурация
├── vite.config.ts                  # Vite конфигурация сборки
└── components.json                 # Конфигурация shadcn/ui компонентов
```

## ✨ Возможности

- **Многоязычный фаззинг**: Генерация оберток для C/C++, Ruby, Python с интеллектуальными тест-кейсами
- **Интеграция инструментов безопасности**: 15+ SAST/DAST инструментов с автоматической установкой
- **Контроль доступа на основе ролей**: Админы и пользователи с детальными разрешениями
- **Терминал в реальном времени**: WebSocket мониторинг выполнения инструментов с живыми логами
- **Управление проектами**: Организация, отслеживание и управление проектами сканирования безопасности
- **Обнаружение уязвимостей**: Продвинутое сканирование с детальной отчетностью

## 🚀 Быстрый старт

### Системные требования

- **Node.js** 18+ 
- **PostgreSQL** 12+
- **Python** 3.11+
- **Git**
- **Docker** и **Docker Compose** (для Docker развертывания)

### Способ 1: Локальная разработка (Рекомендуется для разработки)

1. **Клонирование репозитория**:
```bash
git clone <repository-url>
cd fuzzbranch-scanner
```

2. **Установка зависимостей**:
```bash
npm install
```

3. **Настройка переменных окружения**:
```bash
cp .env.example .env
```

Отредактируйте `.env` под ваши настройки:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/fuzzbranchdb"
SESSION_SECRET="your-secure-256-bit-session-secret"
NODE_ENV="development"
PORT=5050
```

4. **Настройка базы данных PostgreSQL**:
```bash
# Создание базы данных
sudo -u postgres createdb fuzzbranchdb

# Создание пользователя (опционально)
sudo -u postgres psql -c "CREATE USER fuzzuser WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fuzzbranchdb TO fuzzuser;"
```

5. **Применение миграций базы данных**:
```bash
npm run db:push
```

6. **Запуск приложения**:
```bash
# Режим разработки
npm run dev

# Production сборка
npm run build
npm start
```

7. **Доступ к приложению**: `http://localhost:5050`

### Способ 2: Docker развертывание

1. **Клонирование и подготовка**:
```bash
git clone <repository-url>
cd fuzzbranch-scanner
cp .env.example2 .env
```

2. **Создание директорий для данных**:
```bash
mkdir -p $HOME/fuzzbench-data
mkdir -p $HOME/fuzzbench-data/projects
mkdir -p $HOME/fuzzbench-data/db
```

3. **Редактирование .env файла** (используйте настройки из .env.example2):
```env
DATABASE_URL="postgresql://devsec:secure_password_change_me@localhost:5433/devsec_scanner"
SESSION_SECRET="super-secure-secret-should-be-256-bit"
NODE_ENV="development"
PORT=5050
# ... остальные настройки
```

4. **Запуск через Docker Compose**:
```bash
docker-compose up -d
```

5. **Проверка статуса**:
```bash
docker-compose ps
docker-compose logs app
```

6. **Доступ к приложению**: `http://localhost:5050`

## 🔧 API Документация

### Аутентификация
- `POST /api/auth/login` - Вход пользователя
- `POST /api/auth/logout` - Выход пользователя
- `GET /api/auth/user` - Информация о текущем пользователе

### Управление пользователями (только админ)
- `GET /api/admin/users` - Список всех пользователей
- `POST /api/admin/users` - Создание пользователя
- `PATCH /api/admin/users/:id/role` - Изменение роли пользователя
- `DELETE /api/admin/users/:id` - Удаление пользователя

### Инструменты безопасности
- `GET /api/tools` - Список доступных инструментов
- `PATCH /api/tools/:id/install` - Установка инструмента (только админ)
- `POST /api/tools/:id/run` - Запуск инструмента (только админ)

### Проекты
- `GET /api/projects` - Проекты пользователя
- `POST /api/projects` - Создание проекта
- `DELETE /api/projects/:id` - Удаление проекта

### Сканирование безопасности
- `GET /api/scans` - Сканы пользователя
- `POST /api/scans` - Создание скана
- `GET /api/scans/:id` - Результаты скана

### Fuzzing обертки
- `POST /api/wrappers/generate` - Генерация обертки
- `GET /api/wrappers` - Обертки пользователя
- `DELETE /api/wrappers/:id` - Удаление обертки

### Статистика
- `GET /api/stats` - Статистика панели управления

### WebSocket
- `WS /ws` - Терминал в реальном времени

## 🛠️ Инструменты безопасности

### DAST (Динамический анализ)
- **AFL++**: Продвинутый фаззер American Fuzzy Lop с улучшенной производительностью
- **libFuzzer**: Фаззер LLVM с покрытием кода
- **afl-ruby**: Специализированные возможности фаззинга для Ruby
- **OWASP ZAP**: Комплексный сканер безопасности веб-приложений
- **Nikto**: Сканер уязвимостей веб-серверов

### SAST (Статический анализ)
- **SonarQube**: Анализ качества кода и безопасности
- **Semgrep**: Быстрый статический анализ для поиска багов и проблем безопасности
- **RuboCop**: Статический анализатор и форматтер Ruby кода
- **RubyCritic**: Репортер качества Ruby кода

### Генераторы fuzzing-оберток
- **futage**: Генератор оберток C/C++ для интеграции с AFL++
- **dewrapper**: Генератор оберток для Ruby приложений
- **PyFuzzWrap**: Генератор fuzzing-оберток для Python приложений

## 🔒 Учетные данные по умолчанию

- **Администратор**: admin@example.com / admin123
- **Обычный пользователь**: user@example.com / user123

**⚠️ Важно**: Смените пароли по умолчанию в production!

## 🐛 Устранение неполадок

### Частые проблемы

1. **Ошибка подключения к базе данных**:
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Проверить подключение
psql $DATABASE_URL -c "SELECT version();"
```

2. **Порт уже используется**:
```bash
# Найти процесс использующий порт
sudo lsof -i :5050

# Остановить процесс
sudo kill -9 <PID>
```

3. **Ошибки установки зависимостей**:
```bash
# Очистить кеш npm
npm cache clean --force

# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install
```

4. **Docker проблемы**:
```bash
# Пересборка контейнеров
docker-compose down
docker-compose up --build

# Очистка Docker
docker system prune -a
```

### Логи и отладка

```bash
# Логи приложения (локально)
npm run dev

# Логи Docker
docker-compose logs -f app
docker-compose logs -f postgres

# Проверка базы данных
docker-compose exec postgres psql -U devsec -d devsec_scanner -c "\dt"
```

## 📊 Мониторинг

### Проверка здоровья системы
- Приложение: `http://localhost:5050/api/auth/user`
- База данных: Проверка подключения через API
- WebSocket: Подключение терминала

### Директории данных
- **Проекты**: `$HOME/fuzzbench-data/projects/`
- **Инструменты**: `$HOME/devsec-tools/`
- **Логи**: Консольный вывод

## 🔄 Разработка

### Команды разработки
```bash
# Запуск в режиме разработки
npm run dev

# Сборка для production
npm run build

# Запуск production версии
npm start

# Обновление схемы базы данных
npm run db:push

# Генерация миграций
npm run db:generate
```

### Структура разработки
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **База данных**: PostgreSQL + Drizzle ORM
- **Стили**: Tailwind CSS + shadcn/ui
- **WebSocket**: ws библиотека для терминала

## 📄 Лицензия

MIT License - см. файл LICENSE для деталей

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте ветку функции: `git checkout -b feature/amazing-feature`
3. Внесите изменения и тщательно протестируйте
4. Отправьте pull request с подробным описанием

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Убедитесь в корректности переменных окружения
3. Проверьте подключение к базе данных
4. Убедитесь в наличии всех системных зависимостей


Да, на изображении показана структура базы данных с таблицами и их связями. Давайте разберем каждую таблицу:
sessions - таблица для хранения сессий пользователей:
sid - идентификатор сессии
sess - данные сессии в формате JSON
expire - время истечения сессии
users - таблица пользователей:
id - уникальный идентификатор
email - электронная почта
password - пароль
first_name - имя
last_name - фамилия
profile_image_url - URL аватара
role - роль пользователя
created_at - дата создания
updated_at - дата обновления
projects - таблица проектов:
id - уникальный идентификатор
name - название проекта
description - описание
project_path - путь к проекту
user_id - ID владельца (связь с таблицей users)
created_at - дата создания
wrappers - таблица оберток для фаззинга:
id - уникальный идентификатор
user_id - ID пользователя (связь с таблицей users)
language - язык программирования
filename - имя файла
code - код обертки
path - путь к файлу
options - дополнительные опции
created_at - дата создания
tools - таблица инструментов:
id - уникальный идентификатор
name - название инструмента
type - тип инструмента
description - описание
install_command - команда установки
run_command - команда запуска
installed - флаг установки
owner_id - ID владельца (связь с таблицей users)
created_at - дата создания
scans - таблица сканирований:
id - уникальный идентификатор
project_id - ID проекта (связь с таблицей projects)
tool_id - ID инструмента (связь с таблицей tools)
status - статус сканирования
result - результат в формате JSON
target_url - целевой URL
options - опции сканирования
started_at - время начала
finished_at - время завершения
created_at - дата создания
Все таблицы правильно связаны между собой через внешние ключи, что обеспечивает целостность данных. Например, каждый проект принадлежит пользователю, каждое сканирование связано с проектом и инструментом, и т.д.
