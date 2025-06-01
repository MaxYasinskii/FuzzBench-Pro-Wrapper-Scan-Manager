
# FuzzBranch Scanner - Deployment Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Git
- Python 3.11+ (для инструментов безопасности)
- Docker и Docker Compose (для Docker развертывания)

## Способ 1: Локальное развертывание

### 1. Клонирование и установка
```bash
git clone <your-repository-url>
cd fuzzbranch-scanner
npm install
```

### 2. Настройка окружения
```bash
cp .env.example .env
```

Отредактируйте `.env` файл:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/fuzzbranchdb"
SESSION_SECRET="your-256-bit-random-string"
NODE_ENV="development"
PORT=5050
```

### 3. Настройка базы данных
```bash
# Создание базы данных
sudo -u postgres createdb fuzzbranchdb

# Создание пользователя (опционально)
sudo -u postgres psql -c "CREATE USER fuzzuser WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fuzzbranchdb TO fuzzuser;"

# Применение схемы
npm run db:push
```

### 4. Запуск приложения
```bash
# Разработка
npm run dev

# Production
npm run build
npm start
```

## Способ 2: Docker развертывание

### 1. Подготовка
```bash
git clone <your-repository-url>
cd fuzzbranch-scanner
cp .env.example2 .env
```

### 2. Создание директорий
```bash
mkdir -p $HOME/fuzzbench-data
mkdir -p $HOME/fuzzbench-data/projects
mkdir -p $HOME/fuzzbench-data/db
mkdir -p $HOME/devsec-tools
```

### 3. Настройка переменных окружения
Используйте настройки из `.env.example2`:
```env
DATABASE_URL="postgresql://devsec:secure_password_change_me@postgres:5432/devsec_scanner"
SESSION_SECRET="super-secure-secret-should-be-256-bit"
NODE_ENV="development"
PORT=5050
PGHOST=postgres
PGPORT=5432
PGUSER=devsec
PGPASSWORD=secure_password_change_me
PGDATABASE=devsec_scanner
```

### 4. Запуск
```bash
docker-compose up -d
```

### 5. Проверка
```bash
# Статус контейнеров
docker-compose ps

# Логи приложения
docker-compose logs -f app

# Логи базы данных
docker-compose logs -f postgres
```

## Проверка развертывания

### Тест подключения к базе данных
```bash
# Локально
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

# В Docker
docker-compose exec postgres psql -U devsec -d devsec_scanner -c "\dt"
```

Ожидаемые таблицы: sessions, users, tools, projects, scans, wrappers

### Тест API эндпоинтов
```bash
# Тест входа
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Список инструментов
curl http://localhost:5050/api/tools
```

## Учетные данные по умолчанию

- **Администратор**: admin@example.com / admin123
- **Пользователь**: user@example.com / user123

**Важно**: Смените пароли в production!

## Production чеклист

### Безопасность
- [ ] Изменить пароли по умолчанию
- [ ] Установить надежный SESSION_SECRET
- [ ] Настроить HTTPS
- [ ] Настроить правила firewall
- [ ] Регулярные обновления безопасности

### База данных
- [ ] PostgreSQL настроен и запущен
- [ ] Настроены backup'ы базы данных
- [ ] Установлены лимиты подключений

### Приложение
- [ ] Переменные окружения настроены
- [ ] Настроен менеджер процессов (PM2/systemd)
- [ ] Настроена ротация логов
- [ ] Настроен мониторинг

### Системные зависимости
- [ ] Python 3.11+ установлен
- [ ] Ruby установлен (для Ruby инструментов)
- [ ] Docker установлен (для контейнерных инструментов)
- [ ] Инструменты сборки (gcc, make)

## Устранение неполадок

### Частые проблемы

1. **Ошибка подключения к базе данных**:
   - Проверить формат DATABASE_URL
   - Убедиться что PostgreSQL запущен
   - Проверить учетные данные и разрешения

2. **Ошибка установки инструментов**:
   - Проверить наличие Python/pip
   - Проверить системные зависимости
   - Проверить сетевое подключение

3. **Проблемы с сессиями**:
   - Проверить что SESSION_SECRET установлен
   - Проверить что таблица sessions существует
   - Очистить cookies браузера

4. **Ошибки разрешений**:
   - Проверить роли пользователей в базе данных
   - Проверить middleware аутентификации
   - Проверить валидность сессии

5. **Конфликт портов**:
   - Проверить что порт 5050 свободен: `sudo lsof -i :5050`
   - Остановить конфликтующие процессы
   - Изменить PORT в .env файле при необходимости

### Расположение логов

- Логи приложения: консольный вывод
- Логи базы данных: логи PostgreSQL
- Установка инструментов: вывод WebSocket терминала

## Оптимизация производительности

### База данных
- Создать индексы на часто запрашиваемых колонках
- Регулярный VACUUM и ANALYZE
- Пул соединений

### Приложение
- Включить gzip сжатие
- Кеширование статических файлов
- CDN для ресурсов

### Инструменты безопасности
- Ограничить количество одновременных выполнений
- Реализовать механизмы timeout'а
- Мониторинг использования ресурсов

## Backup стратегия

### Backup базы данных
```bash
# Локально
pg_dump fuzzbranchdb > backup_$(date +%Y%m%d).sql

# Docker
docker-compose exec postgres pg_dump -U devsec devsec_scanner > backup_$(date +%Y%m%d).sql
```

### Backup приложения
- Исходный код (Git репозиторий)
- Конфигурационные файлы
- Сгенерированные обертки
- Файлы логов

## Мониторинг

### Health Check'и
- `/api/auth/user` - здоровье приложения
- Подключение к базе данных
- Использование дискового пространства
- Использование памяти

### Метрики для мониторинга
- Время отклика
- Частота ошибок
- Производительность базы данных
- Успешность выполнения инструментов
- Активность пользователей

## Поддержка

При проблемах с развертыванием:
1. Проверить логи на сообщения об ошибках
2. Убедиться что все предварительные требования выполнены
3. Протестировать подключение к базе данных
4. Проверить переменные окружения
5. Проверить системные зависимости
