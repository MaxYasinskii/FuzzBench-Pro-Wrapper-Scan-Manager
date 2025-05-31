# FuzzBranch Scanner - Host Installation Guide

## Проблема с Docker контейнером

Ошибка `spawn bash ENOENT` возникает потому что инструменты пытаются установиться внутри Docker контейнера, где отсутствуют необходимые системные зависимости.

## Решение 1: Запуск на хост-машине (Рекомендуется)

### Установка и запуск напрямую на сервере:

```bash
# 1. Установить Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Установить PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 3. Установить Python и pip
sudo apt-get install python3 python3-pip

# 4. Установить Ruby
sudo apt-get install ruby ruby-dev

# 5. Клонировать проект
git clone <your-repo-url>
cd fuzzbrach-scanner

# 6. Установить зависимости
npm install

# 7. Настроить базу данных
sudo -u postgres createdb fuzzbranchdb
sudo -u postgres psql -c "CREATE USER fuzzuser WITH PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fuzzbranchdb TO fuzzuser;"

# 8. Настроить .env
cp .env.example .env
# Отредактировать .env:
# DATABASE_URL="postgresql://fuzzuser:password@localhost:5432/fuzzbranchdb"

# 9. Инициализировать базу данных
npm run db:push

# 10. Запустить приложение
npm run dev  # для разработки
npm run build && npm start  # для продакшена
```

## Решение 2: Docker с правильной конфигурацией

Если все же хотите использовать Docker, обновите Dockerfile:

```dockerfile
FROM ubuntu:22.04

# Установить системные зависимости
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    ruby \
    ruby-dev \
    build-essential \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Установить приложение
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

## Обновленные команды установки инструментов

Для хост-машины команды должны быть:

```bash
# Python инструменты
pip3 install pyfuzzwrap
pip3 install semgrep

# Ruby инструменты  
gem install rubycritic
gem install rubocop

# Системные инструменты
sudo apt-get install nikto
```

## Проверка установки

После запуска на хост-машине:

```bash
# Проверить доступность команд
python3 --version
pip3 --version
ruby --version
gem --version

# Проверить приложение
curl http://localhost:5000/api/stats
```

## Текущая ошибка

Проблема в том, что команда `spawn('bash')` пытается выполниться в минимальном Alpine Linux контейнере где нет bash и системных инструментов.

Исправлена команда в коде:
- Заменено `spawn('bash')` на `spawn('sh')` 
- Добавлены системные зависимости в Dockerfile

Но лучше всего запускать приложение напрямую на хост-машине для полной функциональности установки инструментов.