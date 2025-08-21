const TelegramBot = require('node-telegram-bot-api');

// Замените на ваш токен бота
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';

if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.log('❌ Сначала замените BOT_TOKEN на ваш токен!');
  console.log('1. Найдите @BotFather в Telegram');
  console.log('2. Отправьте /newbot');
  console.log('3. Получите токен и вставьте его в этот файл');
  process.exit(1);
}

// Создаем бота с polling
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Бот запущен!');
console.log('📱 Теперь:');
console.log('1. Найдите вашего бота в Telegram');
console.log('2. Отправьте ему любое сообщение');
console.log('3. Chat ID появится здесь автоматически');
console.log('');

// Обработчик всех сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  const chatTitle = msg.chat.title || msg.chat.first_name || 'Личный чат';
  
  console.log('📨 Получено сообщение:');
  console.log(`👤 От: ${msg.from.first_name} ${msg.from.last_name || ''}`);
  console.log(`💬 Текст: ${msg.text}`);
  console.log(`🆔 Chat ID: ${chatId}`);
  console.log(`📋 Тип чата: ${chatType}`);
  console.log(`🏷️ Название: ${chatTitle}`);
  console.log('');
  
  // Отправляем подтверждение
  bot.sendMessage(chatId, `✅ Ваш Chat ID: ${chatId}\n\nТеперь вы можете использовать его в настройках мониторинга!`);
  
  if (chatType === 'private') {
    console.log('🎯 Для личного чата используйте этот Chat ID:', chatId);
  } else {
    console.log('👥 Для группового чата используйте этот Chat ID:', chatId);
  }
  
  console.log('');
  console.log('💡 Чтобы остановить бота, нажмите Ctrl+C');
});

// Обработка ошибок
bot.on('error', (error) => {
  console.error('❌ Ошибка бота:', error.message);
});

// Обработка остановки
process.on('SIGINT', () => {
  console.log('\n🛑 Останавливаю бота...');
  bot.stopPolling();
  process.exit(0);
});

console.log('⏳ Ожидаю сообщения...');
console.log('💡 Нажмите Ctrl+C для остановки');
