# Интеграция скриптов с веб-интерфейсом

## Архитектура скриптов

### Расположение скриптов
```
scripts/
├── host-tool-manager.py    # Основной менеджер инструментов
├── pyfuzz_gen.py          # Генератор Python fuzzing wrappers
└── transform.py           # Генератор Ruby fuzzing wrappers
```

### Принцип работы

**1. Скрипты-генераторы (Python/Ruby):**
- Поставляются в составе проекта в папке `scripts/`
- При нажатии "Install" копируются в `/home/$USER/fuzzbench-data/tools/wrappers/`
- Не требуют реальной установки - просто копирование файлов

**2. Бинарные инструменты (futage, AFL++):**
- Требуют реальной установки через пакетные менеджеры
- Устанавливаются в соответствующие системные директории

## Интеграция с веб-интерфейсом

### Передача данных из веб-интерфейса в скрипты

**1. Через параметры командной строки:**
```bash
# Для Python wrapper
python3 /path/to/pyfuzz_gen.py /project/path --iterations 500 --output /output/dir

# Для Ruby wrapper  
python3 /path/to/transform.py /project/path --methods method1,method2 --output /output/dir
```

**2. Через веб-API endpoints:**
- Проекты создаются через `/api/projects` с полной информацией о пути
- Параметры сканирования передаются через `/api/scans`
- Результаты сохраняются в JSON и отображаются в веб-интерфейсе

**3. Данные из веб-форм попадают в скрипты:**

**Создание проекта:**
```typescript
// Веб-форма
{ name: "MyProject", description: "...", projectPath: "/home/user/project" }

// Передается в скрипт как:
python3 scripts/pyfuzz_gen.py "/home/user/project"
```

**Настройка сканирования:**
```typescript
// Веб-форма
{ toolId: 13, projectId: 1, options: "--iterations 1000" }

// Передается в скрипт как:
python3 scripts/pyfuzz_gen.py "/project/path" --iterations 1000
```

### Конфигурация инструментов

**Кнопка Configure позволяет настроить:**
- `installCommand` - команда установки инструмента
- `runCommand` - команда запуска по умолчанию  
- `description` - описание инструмента

**Пример конфигурации для PyFuzzWrap:**
```json
{
  "installCommand": "cp scripts/pyfuzz_gen.py /target/directory/",
  "runCommand": "python3 pyfuzz_gen.py --iterations 500",
  "description": "Python fuzzing wrapper generator"
}
```

### Поток данных

```
Веб-интерфейс → API → host-tool-manager.py → Скрипт → Результат → API → Веб-интерфейс
```

**1. Пользователь создает проект:**
- Заполняет форму с путем к проекту
- Данные сохраняются в базе через API

**2. Пользователь запускает сканирование:**
- Выбирает проект и инструмент
- Указывает дополнительные параметры
- API передает все данные в host-tool-manager.py

**3. Скрипт обрабатывает проект:**
- Получает путь к проекту и параметры
- Анализирует код (Python/Ruby файлы)
- Генерирует fuzzing wrapper
- Сохраняет результаты в JSON

**4. Результаты возвращаются в веб-интерфейс:**
- JSON с результатами анализа
- Статистика найденных функций/методов
- Сгенерированные wrapper файлы

## Примеры интеграции

### Python проект
```python
# Веб-интерфейс отправляет:
{
  "projectPath": "/home/user/my_python_app",
  "language": "python", 
  "options": "--iterations 1000"
}

# Скрипт получает и обрабатывает:
python3 scripts/pyfuzz_gen.py "/home/user/my_python_app" --iterations 1000

# Возвращает результат:
{
  "wrapper_file": "/home/user/my_python_app/fuzzing_wrappers/python_fuzz_wrapper.py",
  "functions_found": 25,
  "status": "success"
}
```

### Ruby проект
```python
# Веб-интерфейс отправляет:
{
  "projectPath": "/home/user/my_ruby_app",
  "language": "ruby",
  "targetMethods": ["authenticate", "process_data"]
}

# Скрипт получает и обрабатывает:
python3 scripts/transform.py "/home/user/my_ruby_app" --methods authenticate,process_data

# Возвращает результат:
{
  "wrapper_file": "/home/user/my_ruby_app/fuzzing_wrappers/ruby_fuzz_wrapper.rb", 
  "methods_found": 12,
  "status": "success"
}
```

## Конфигурация через веб-интерфейс

Администраторы могут настроить инструменты через кнопку "Configure":

**Настройки для PyFuzzWrap:**
- Install Command: `cp scripts/pyfuzz_gen.py {target_dir}`
- Run Command: `python3 pyfuzz_gen.py {project_path} --iterations {iterations}`
- Description: Генератор Python fuzzing оберток

**Настройки для DeWrapper:**
- Install Command: `cp scripts/transform.py {target_dir}`  
- Run Command: `python3 transform.py {project_path} --methods {methods}`
- Description: Генератор Ruby fuzzing оберток

Все настройки сохраняются в базе данных и используются при запуске инструментов.