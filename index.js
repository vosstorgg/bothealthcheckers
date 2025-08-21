require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Конфигурация
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '*/5 * * * *'; // Каждые 5 минут по умолчанию

// Список ботов для мониторинга
const BOTS = [
  {
    name: 'Dream Sense Bot',
    url: process.env.DREAM_SENSE_BOT_URL || 'https://dream-sense-bot.railway.app/health',
    description: 'Dream Sense Bot на Railway'
  },
  {
    name: 'Dream Sense Test Bot',
    url: process.env.DREAM_SENSE_TEST_BOT_URL || 'https://dream-sense-test-bot.railway.app/health',
    description: 'Dream Sense Test Bot на Railway'
  },
  {
    name: 'Valiant Grace Bot',
    url: process.env.VALIANT_GRACE_BOT_URL || 'https://valiant-grace.railway.app/health',
    description: 'Valiant Grace Bot на Railway'
  }
];

// Инициализация Telegram бота
let bot;
if (TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
}

// Функция для проверки здоровья бота
async function checkBotHealth(bot) {
  try {
    console.log(`Проверяю ${bot.name}...`);
    
    const response = await axios.get(bot.url, {
      timeout: 10000, // 10 секунд таймаут
      validateStatus: function (status) {
        return status < 500; // Принимаем любые статусы меньше 500
      }
    });
    
    if (response.status === 200) {
      console.log(`✅ ${bot.name} работает нормально`);
      return { status: 'healthy', bot: bot.name, response: response.status };
    } else {
      console.log(`⚠️ ${bot.name} отвечает со статусом ${response.status}`);
      return { status: 'warning', bot: bot.name, response: response.status };
    }
  } catch (error) {
    console.error(`❌ Ошибка при проверке ${bot.name}:`, error.message);
    return { 
      status: 'error', 
      bot: bot.name, 
      error: error.message,
      code: error.code || 'UNKNOWN'
    };
  }
}

// Функция для отправки уведомления в Telegram
async function sendTelegramNotification(message) {
  if (!bot || !TELEGRAM_CHAT_ID) {
    console.log('Telegram не настроен, пропускаю уведомление');
    return;
  }
  
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
    console.log('Уведомление отправлено в Telegram');
  } catch (error) {
    console.error('Ошибка при отправке в Telegram:', error.message);
  }
}

// Функция для мониторинга всех ботов
async function monitorAllBots() {
  console.log(`\n🕐 Начинаю проверку ботов: ${new Date().toLocaleString('ru-RU')}`);
  
  const results = [];
  
  for (const bot of BOTS) {
    const result = await checkBotHealth(bot);
    results.push(result);
    
    // Небольшая пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Анализ результатов
  const healthy = results.filter(r => r.status === 'healthy');
  const warnings = results.filter(r => r.status === 'warning');
  const errors = results.filter(r => r.status === 'error');
  
  console.log(`\n📊 Результаты проверки:`);
  console.log(`✅ Работают: ${healthy.length}`);
  console.log(`⚠️ Предупреждения: ${warnings.length}`);
  console.log(`❌ Ошибки: ${errors.length}`);
  
  // Отправляем уведомления только при проблемах
  if (warnings.length > 0 || errors.length > 0) {
    let message = `🚨 <b>Проблемы с ботами обнаружены!</b>\n\n`;
    
    if (errors.length > 0) {
      message += `❌ <b>Критические ошибки:</b>\n`;
      errors.forEach(error => {
        message += `• <b>${error.bot}</b>: ${error.error}\n`;
      });
      message += '\n';
    }
    
    if (warnings.length > 0) {
      message += `⚠️ <b>Предупреждения:</b>\n`;
      warnings.forEach(warning => {
        message += `• <b>${warning.bot}</b>: HTTP ${warning.response}\n`;
      });
    }
    
    message += `\n🕐 Время проверки: ${new Date().toLocaleString('ru-RU')}`;
    
    await sendTelegramNotification(message);
  } else {
    console.log('🎉 Все боты работают нормально!');
  }
}

// Функция для отправки тестового сообщения
async function sendTestMessage() {
  if (!bot || !TELEGRAM_CHAT_ID) {
    console.log('Telegram не настроен');
    return;
  }
  
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, '🧪 <b>Тестовое сообщение</b>\n\nБот мониторинга запущен и работает!', { parse_mode: 'HTML' });
    console.log('Тестовое сообщение отправлено');
  } catch (error) {
    console.error('Ошибка при отправке тестового сообщения:', error.message);
  }
}

// Основная функция запуска
async function startMonitoring() {
  console.log('🚀 Запуск мониторинга ботов...');
  console.log(`📱 Telegram бот: ${TELEGRAM_BOT_TOKEN ? 'Настроен' : 'Не настроен'}`);
  console.log(`👥 Chat ID: ${TELEGRAM_CHAT_ID || 'Не указан'}`);
  console.log(`⏰ Интервал проверки: ${CHECK_INTERVAL}`);
  console.log(`🤖 Ботов для мониторинга: ${BOTS.length}`);
  
  // Отправляем тестовое сообщение при запуске
  await sendTestMessage();
  
  // Запускаем первую проверку
  await monitorAllBots();
  
  // Настраиваем cron для периодических проверок
  cron.schedule(CHECK_INTERVAL, async () => {
    await monitorAllBots();
  });
  
  console.log('✅ Мониторинг запущен и работает!');
}

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанное отклонение промиса:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Необработанное исключение:', error);
  process.exit(1);
});

// Запуск приложения
startMonitoring().catch(error => {
  console.error('Ошибка при запуске:', error);
  process.exit(1);
});
