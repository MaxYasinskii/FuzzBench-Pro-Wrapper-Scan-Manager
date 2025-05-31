# Docker + Host Tools Installation

## Архитектура

- **Веб-приложение**: Запускается в Docker контейнере
- **База данных**: PostgreSQL в отдельном контейнере  
- **Инструменты безопасности**: Устанавливаются на хост-машину

## Подготовка хост-машины

Установите необходимые зависимости на хост-машину:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip ruby ruby-dev build-essential

# CentOS/RHEL
sudo yum install -y python3 python3-pip ruby ruby-devel gcc make

# На хосте должны быть доступны команды:
python3 --version
pip3 --version
ruby --version
gem --version
```

## Конфигурация Docker

Обновленный `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - SESSION_SECRET=${SESSION_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres
    volumes:
      - .:/app
      - /app/node_modules
    privileged: true
    pid: host
    network_mode: host

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=fuzzbranchdb
      - POSTGRES_USER=fuzzuser
      - POSTGRES_PASSWORD=securepassword123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Как это работает

1. **Веб-приложение** запускается в Docker контейнере
2. При установке инструмента выполняется команда:
   ```bash
   nsenter -t 1 -m -u -n -i sh -c "pip3 install pyfuzzwrap"
   ```
3. `nsenter` позволяет выполнить команду в пространстве имен хоста
4. Инструмент устанавливается на хост-машину, а не в контейнер

## Команды установки

Инструменты будут использовать эти команды:

```bash
# Python инструменты (устанавливаются на хост)
pip3 install pyfuzzwrap
pip3 install semgrep

# Ruby инструменты (устанавливаются на хост)  
gem install rubycritic
gem install rubocop

# Docker инструменты
docker pull owasp/zap2docker-stable
docker pull sonarqube
```

## Развертывание

1. **Подготовить .env файл**:
```env
SESSION_SECRET="your-secure-session-secret"
DATABASE_URL="postgresql://fuzzuser:securepassword123@postgres:5432/fuzzbranchdb"
```

2. **Запустить контейнеры**:
```bash
docker-compose up -d
```

3. **Инициализировать базу данных**:
```bash
docker-compose exec app npm run db:push
```

4. **Проверить работу**:
```bash
curl http://localhost:5000/api/stats
```

## Проверка установки инструментов

После установки через веб-интерфейс, проверьте на хосте:

```bash
# Проверить Python инструменты
pip3 list | grep pyfuzzwrap
pip3 list | grep semgrep

# Проверить Ruby инструменты
gem list | grep rubycritic
gem list | grep rubocop

# Проверить Docker образы
docker images | grep owasp
docker images | grep sonarqube
```

## Безопасность

- Контейнер запускается с `privileged: true`
- Используется `pid: host` для доступа к процессам хоста
- `nsenter` требует соответствующих привилегий

## Альтернативный подход

Если nsenter не работает, можно использовать монтирование Docker сокета:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
  - /usr/local/bin:/host/usr/local/bin
  - /usr/bin:/host/usr/bin
```

И выполнять команды через:
```bash
docker run --rm -v /usr/local/bin:/host/usr/local/bin ubuntu:20.04 sh -c "apt update && apt install -y python3-pip && pip3 install pyfuzzwrap"
```

Этот подход обеспечивает установку инструментов безопасности на хост-машину, сохраняя веб-приложение в изолированном контейнере.