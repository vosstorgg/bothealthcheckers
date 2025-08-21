# Bot Health Monitor 🚀

Микропроект для мониторинга здоровья ботов на Railway с уведомлениями в Telegram.

## 🎯 Функциональность

- ✅ Автоматическая проверка здоровья ботов каждые 5 минут
- 📱 Уведомления в Telegram при обнаружении проблем
- 🔄 Мониторинг 3 ботов: Dream Sense, Dream Sense Test, Valiant Grace
- ⚡ Быстрая диагностика с таймаутом 10 секунд
- 📊 Детальная статистика и логирование

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/vosst/bot-health-monitor.git
cd bot-health-monitor
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка переменных окружения

Скопируйте `env.example` в `.env` и заполните:

```bash
cp env.example .env
```

Отредактируйте `.env` файл:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Bot URLs для мониторинга
DREAM_SENSE_BOT_URL=https://dream-sense-bot.railway.app/health
DREAM_SENSE_TEST_BOT_URL=https://dream-sense-test-bot.railway.app/health
VALIANT_GRACE_BOT_URL=https://valiant-grace.railway.app/health

# Интервал проверки (cron формат)
CHECK_INTERVAL=*/5 * * * *  # Каждые 5 минут
```

### 4. Запуск

```bash
npm start
```

## 📱 Настройка Telegram бота

### 1. Создание бота

1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям и получите токен

### 2. Получение Chat ID

1. Добавьте бота в нужный чат
2. Отправьте любое сообщение в чат
3. Перейдите по ссылке: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Найдите `chat.id` в ответе

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Токен вашего Telegram бота | `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `TELEGRAM_CHAT_ID` | ID чата для уведомлений | `-1001234567890` |
| `DREAM_SENSE_BOT_URL` | URL для проверки Dream Sense бота | `https://dream-sense-bot.railway.app/health` |
| `DREAM_SENSE_TEST_BOT_URL` | URL для проверки Dream Sense Test бота | `https://dream-sense-test-bot.railway.app/health` |
| `VALIANT_GRACE_BOT_URL` | URL для проверки Valiant Grace бота | `https://valiant-grace.railway.app/health` |
| `CHECK_INTERVAL` | Интервал проверки в cron формате | `*/5 * * * *` (каждые 5 минут) |

### Cron формат

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── День недели (0-7, где 0 и 7 = воскресенье)
│ │ │ └───── Месяц (1-12)
│ │ └─────── День месяца (1-31)
│ └───────── Час (0-23)
└─────────── Минута (0-59)
```

**Примеры:**
- `*/5 * * * *` - каждые 5 минут
- `0 */2 * * *` - каждые 2 часа
- `0 9 * * *` - каждый день в 9:00

## 📊 Логи и мониторинг

Приложение выводит подробные логи:

```
🚀 Запуск мониторинга ботов...
📱 Telegram бот: Настроен
👥 Chat ID: -1001234567890
⏰ Интервал проверки: */5 * * * *
🤖 Ботов для мониторинга: 3

🕐 Начинаю проверку ботов: 21.08.2025, 19:33:00
Проверяю Dream Sense Bot...
✅ Dream Sense Bot работает нормально
Проверяю Dream Sense Test Bot...
✅ Dream Sense Test Bot работает нормально
Проверяю Valiant Grace Bot...
✅ Valiant Grace Bot работает нормально

📊 Результаты проверки:
✅ Работают: 3
⚠️ Предупреждения: 0
❌ Ошибки: 0
🎉 Все боты работают нормально!
```

## 🚨 Уведомления

### При проблемах

```
🚨 Проблемы с ботами обнаружены!

❌ Критические ошибки:
• Dream Sense Bot: connect ECONNREFUSED

⚠️ Предупреждения:
• Valiant Grace Bot: HTTP 500

🕐 Время проверки: 21.08.2025, 19:33:00
```

### При запуске

```
🧪 Тестовое сообщение

Бот мониторинга запущен и работает!
```

## 🐳 Docker

### Сборка образа

```bash
docker build -t bot-health-monitor .
```

### Запуск контейнера

```bash
docker run -d \
  --name bot-monitor \
  --env-file .env \
  bot-health-monitor
```

## 🚀 Railway Deployment

### 1. Создание проекта

Создайте новый проект на Railway и подключите этот репозиторий.

### 2. Настройка переменных

В настройках сервиса добавьте все необходимые переменные окружения.

### 3. Деплой

Railway автоматически развернет приложение при push в main ветку.

## 🔍 Диагностика

### Проверка здоровья ботов

Каждый бот должен иметь endpoint `/health` который возвращает:
- `200 OK` - бот работает нормально
- `4xx` - предупреждение (например, временная недоступность)
- `5xx` - критическая ошибка
- Таймаут/соединение отказано - критическая ошибка

### Логи Railway

```bash
railway logs --service bot-health-monitor
```

## 📝 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 🤝 Поддержка

Если у вас есть вопросы или проблемы:

1. Создайте Issue в GitHub
2. Обратитесь в Telegram: @vosst
3. Проверьте логи Railway

---

**Создано с ❤️ для мониторинга ботов на Railway**
