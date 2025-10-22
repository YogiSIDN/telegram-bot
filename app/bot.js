const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

const app = express();

// Gunakan environment variables untuk token
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/bot` : process.env.WEBHOOK_URL;

// Inisialisasi bot
const bot = new TelegramBot(token);

// Middleware untuk parsing JSON
app.use(express.json());

// Handler untuk webhook
app.post('/api/bot', async (req, res) => {
  try {
    const update = req.body;
    
    // Process update
    await handleUpdate(update);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing update:', error);
    res.status(500).send('Error');
  }
});

// Handler untuk berbagai jenis pesan
async function handleUpdate(update) {
  if (update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const firstName = update.message.from.first_name;

    console.log(`Pesan dari ${firstName}: ${text}`);

    // Handler untuk command /start
    if (text === '/start') {
      await bot.sendMessage(chatId, 
        `Halo ${firstName}! 👋\n\n` +
        `Saya adalah bot Telegram yang berjalan di Vercel.\n\n` +
        `Commands yang tersedia:\n` +
        `/start - Memulai bot\n` +
        `/help - Bantuan\n` +
        `/info - Info tentang bot\n` +
        `/echo [pesan] - Mengulang pesan`
      );
    }
    
    // Handler untuk command /help
    else if (text === '/help') {
      await bot.sendMessage(chatId,
        `🆘 **Bantuan**\n\n` +
        `Berikut adalah commands yang tersedia:\n\n` +
        `• /start - Memulai percakapan\n` +
        `• /help - Menampilkan bantuan\n` +
        `• /info - Informasi bot\n` +
        `• /echo [text] - Echo pesan\n` +
        `• /time - Waktu saat ini\n\n` +
        `Bot ini berjalan di Vercel Serverless Functions.`
      );
    }
    
    // Handler untuk command /info
    else if (text === '/info') {
      await bot.sendMessage(chatId,
        `🤖 **Informasi Bot**\n\n` +
        `• Platform: Vercel\n` +
        `• Runtime: Node.js\n` +
        `• Framework: Express.js\n` +
        `• Deploy: Serverless\n\n` +
        `Bot ini menggunakan webhook untuk menerima update dari Telegram.`
      );
    }
    
    // Handler untuk command /time
    else if (text === '/time') {
      const now = new Date();
      const timeString = now.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      await bot.sendMessage(chatId, `🕐 Waktu saat ini: ${timeString}`);
    }
    
    // Handler untuk command /echo
    else if (text.startsWith('/echo ')) {
      const echoText = text.substring(6);
      if (echoText.trim()) {
        await bot.sendMessage(chatId, `Anda berkata: ${echoText}`);
      } else {
        await bot.sendMessage(chatId, 'Silakan ketik pesan setelah /echo');
      }
    }
    
    // Handler untuk pesan biasa
    else if (!text.startsWith('/')) {
      await bot.sendMessage(chatId, 
        `Anda mengirim: "${text}"\n\n` +
        `Ketik /help untuk melihat commands yang tersedia.`
      );
    }
  }
}

// Endpoint untuk set webhook (bisa diakses via browser)
app.get('/api/set-webhook', async (req, res) => {
  try {
    const result = await bot.setWebHook(webhookUrl);
    res.json({ 
      success: true, 
      message: 'Webhook berhasil di-set',
      webhookUrl: webhookUrl,
      result: result 
    });
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint untuk info webhook
app.get('/api/webhook-info', async (req, res) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    res.json(response.data);
  } catch (error) {
    console.error('Error getting webhook info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Export handler untuk Vercel
module.exports = app;

// Untuk development local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot berjalan di port ${PORT}`);
  });
}
