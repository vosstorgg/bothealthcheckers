require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// Конфигурация
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DAILY_REPORT_TIME = '0 19 * * *'; // Ежедневно в 19:00 МСК
const HOURLY_CHECK_TIME = '0 * * * *'; // Каждый час

// Список ботов для мониторинга
const BOTS = [
  {
    name: 'EphemerisDecoder',
    url: process.env.EPHEMERIS_DECODER_URL || 'https://ephemerisdecoder.up.railway.app/health',
    description: 'EphemerisDecoder сервис на Railway'
  },
  {
    name: 'Dream Sense Bot',
    url: process.env.DREAM_SENSE_BOT_URL || 'https://dream-sense-bot.railway.app/health',
    description: 'Dream Sense Bot на Railway'
  },
  {
    name: 'Dream Sense Test Bot',
    url: process.env.DREAM_SENSE_TEST_BOT_URL || 'https://dream-sense-test-bot.railway.app/health',
    description: 'Dream Sense Test Bot на Railway'
  }
];

// Инициализация Telegram бота
let bot;
if (TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  
  // Обработчик команды /report для получения отчета здесь и сейчас
  bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Проверяем, что команда пришла от авторизованного пользователя
    if (chatId.toString() === TELEGRAM_CHAT_ID) {
      console.log('📊 Запрос отчета по команде /report от пользователя:', chatId);
      
      try {
        // Отправляем сообщение о начале проверки
        await bot.sendMessage(chatId, '🔄 Запускаю проверку всех сервисов...');
        
        // Получаем полный отчет
        await sendDailyReport();
        
        console.log('✅ Отчет по команде /report отправлен');
      } catch (error) {
        console.error('❌ Ошибка при выполнении команды /report:', error.message);
        await bot.sendMessage(chatId, '❌ Ошибка при выполнении команды: ' + error.message);
      }
    } else {
      console.log('🚫 Попытка получить отчет от неавторизованного пользователя:', chatId);
      await bot.sendMessage(chatId, '❌ У вас нет доступа к этому боту.');
    }
  });
  
  // Обработчик команды /help
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    
    if (chatId.toString() === TELEGRAM_CHAT_ID) {
      const helpMessage = `🤖 <b>Команды бота мониторинга:</b>\n\n` +
        `📊 <b>/report</b> - Получить полный отчет о состоянии всех сервисов\n` +
        `❓ <b>/help</b> - Показать эту справку\n\n` +
        `📅 <b>Автоматические отчеты:</b>\n` +
        `• Ежедневный полный отчет в 19:00 МСК\n` +
        `• Ежечасные проверки (уведомления только при ошибках)\n\n` +
        `🕐 Текущее время МСК: ${getMoscowTime()}`;
      
      await bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
    }
  });
  
  console.log('✅ Telegram бот запущен с поддержкой команд /report и /help');
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
    // Улучшенная обработка ошибок
    let errorMessage = error.message;
    let errorCode = error.code || 'UNKNOWN';
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Соединение отказано - сервис недоступен';
      errorCode = 'CONNECTION_REFUSED';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Домен не найден - неправильный URL';
      errorCode = 'DOMAIN_NOT_FOUND';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Таймаут соединения - сервис не отвечает';
      errorCode = 'TIMEOUT';
    } else if (error.response) {
      // Сервер ответил с ошибкой
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      errorCode = `HTTP_${error.response.status}`;
    }
    
    console.error(`❌ Ошибка при проверке ${bot.name}: ${errorMessage} (${errorCode})`);
    return { 
      status: 'error', 
      bot: bot.name, 
      error: errorMessage,
      code: errorCode
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

// Функция для получения времени по МСК
function getMoscowTime() {
  const now = new Date();
  const utcTime = now.toISOString();
  const moscowTime = now.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Логируем для отладки
  console.log(`🕐 Время UTC: ${utcTime}`);
  console.log(`🕐 Время МСК: ${moscowTime}`);
  
  return moscowTime;
}

// Функция для мониторинга всех ботов
async function monitorAllBots() {
  const moscowTime = getMoscowTime();
  console.log(`\n🕐 Начинаю проверку ботов: ${moscowTime} (МСК)`);
  
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
  
  return { results, healthy, warnings, errors, moscowTime };
}

// Функция для отправки ежедневного полного отчета
async function sendDailyReport() {
  console.log('📅 Отправляю ежедневный полный отчет...');
  
  const { results, healthy, warnings, errors, moscowTime } = await monitorAllBots();
  
  let message = `📅 <b>ЕЖЕДНЕВНЫЙ ОТЧЕТ О СОСТОЯНИИ БОТОВ</b>\n\n`;
  message += `✅ <b>Работают нормально:</b> ${healthy.length}\n`;
  message += `⚠️ <b>Предупреждения:</b> ${warnings.length}\n`;
  message += `❌ <b>Критические ошибки:</b> ${errors.length}\n\n`;
  
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
    message += '\n';
  }
  
  if (healthy.length > 0) {
    message += `✅ <b>Работают нормально:</b>\n`;
    healthy.forEach(bot => {
      message += `• <b>${bot.bot}</b>\n`;
    });
    message += '\n';
  }
  
  message += `🕐 Время отчета: ${moscowTime} (МСК)\n`;
  message += `📊 Всего проверено сервисов: ${results.length}`;
  
  await sendTelegramNotification(message);
  console.log('✅ Ежедневный отчет отправлен');
}

// Функция для отправки уведомлений только об ошибках
async function sendErrorNotifications() {
  console.log('🔍 Проверяю на наличие ошибок...');
  
  const { results, healthy, warnings, errors, moscowTime } = await monitorAllBots();
  
  // Отправляем уведомление только если есть ошибки или предупреждения
  if (errors.length > 0 || warnings.length > 0) {
    let message = `🚨 <b>ОБНАРУЖЕНЫ ПРОБЛЕМЫ</b>\n\n`;
    
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
      message += '\n';
    }
    
    message += `🕐 Время проверки: ${moscowTime} (МСК)`;
    
    await sendTelegramNotification(message);
    console.log('🚨 Уведомление об ошибках отправлено');
  } else {
    console.log('✅ Все сервисы работают нормально, уведомление не отправляю');
  }
}

// Функция для отправки тестового сообщения
async function sendTestMessage() {
  if (!bot || !TELEGRAM_CHAT_ID) {
    console.log('Telegram не настроен');
    return;
  }
  
  try {
    const moscowTime = getMoscowTime();
    const message = `🧪 <b>Тестовое сообщение</b>\n\nБот мониторинга запущен и работает!\n\n🕐 Время запуска: ${moscowTime} (МСК)\n\n📅 <b>Режим работы:</b>\n• Ежедневный полный отчет в 19:00 МСК\n• Ежечасные проверки (уведомления только при ошибках)\n\n💬 <b>Команды:</b>\n• <code>/report</code> - Получить отчет сейчас\n• <code>/help</code> - Справка по командам`;
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
    console.log('Тестовое сообщение отправлено');
  } catch (error) {
    console.error('Ошибка при отправке тестового сообщения:', error.message);
  }
}

// Основная функция запуска
async function startMonitoring() {
  const moscowTime = getMoscowTime();
  console.log('🚀 Запуск мониторинга ботов...');
  console.log(`📱 Telegram бот: ${TELEGRAM_BOT_TOKEN ? 'Настроен' : 'Не настроен'}`);
  console.log(`👥 Chat ID: ${TELEGRAM_CHAT_ID || 'Не указан'}`);
  console.log(`📅 Ежедневный отчет: ${DAILY_REPORT_TIME} (19:00 МСК)`);
  console.log(`⏰ Ежечасные проверки: ${HOURLY_CHECK_TIME}`);
  console.log(`🤖 Ботов для мониторинга: ${BOTS.length}`);
  console.log(`🕐 Время запуска: ${moscowTime} (МСК)`);
  
  // Отправляем тестовое сообщение при запуске
  await sendTestMessage();
  
  // Запускаем первую проверку
  await monitorAllBots();
  
  // Настраиваем cron для ежедневного полного отчета в 19:00 МСК
  cron.schedule(DAILY_REPORT_TIME, async () => {
    console.log('📅 Запуск ежедневного отчета...');
    await sendDailyReport();
  });
  
  // Настраиваем cron для ежечасных проверок (только ошибки)
  cron.schedule(HOURLY_CHECK_TIME, async () => {
    console.log('⏰ Запуск ежечасной проверки...');
    await sendErrorNotifications();
  });
  
  console.log('✅ Мониторинг запущен и работает!');
  console.log('📅 Ежедневный полный отчет будет отправляться в 19:00 МСК');
  console.log('⏰ Ежечасные проверки будут отправлять уведомления только при ошибках');
  console.log('💬 Доступны команды: /report, /help');
}

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанное отклонение промиса:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Необработанное исключение:', error);
  process.exit(1);
});

// Создаем HTTP сервер для health check
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    const moscowTime = getMoscowTime();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'Bot Health Monitor',
      timestamp: new Date().toISOString(),
      moscowTime: moscowTime,
      uptime: process.uptime(),
      bots: BOTS.length,
      schedule: {
        dailyReport: '19:00 МСК',
        hourlyChecks: 'Каждый час (только ошибки)'
      }
    }));
  } else if (req.url === '/') {
    const moscowTime = getMoscowTime();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Bot Health Monitor</title></head>
        <body>
          <h1>🤖 Bot Health Monitor</h1>
          <p>Сервис мониторинга здоровья ботов работает!</p>
          <p><a href="/health">Health Check</a></p>
          <p>Время (МСК): ${moscowTime}</p>
          <p>Время (UTC): ${new Date().toISOString()}</p>
          <h3>📅 Расписание:</h3>
          <ul>
            <li><strong>Ежедневный полный отчет:</strong> 19:00 МСК</li>
            <li><strong>Ежечасные проверки:</strong> Только уведомления об ошибках</li>
          </ul>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Запускаем HTTP сервер
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 HTTP сервер запущен на порту ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Запуск приложения
startMonitoring().catch(error => {
  console.error('Ошибка при запуске:', error);
  process.exit(1);
});
