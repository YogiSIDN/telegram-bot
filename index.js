const fetch = require("node-fetch");

const TOKEN = process.env.BOT_TOKEN; // Token bot kamu dari BotFather
const API = `https://api.telegram.org/bot${TOKEN}`;

module.exports = async (req, res) => {
  // Saat Telegram mengirim update (pesan baru)
  if (req.method === "POST") {
    const body = req.body;

    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text || "";

      let reply = "Halo! 👋 Aku hidup di Vercel 🚀";

      if (text === "/start") reply = "Selamat datang di bot Telegram Vercel!";
      else if (text === "/ping") reply = "🏓 Pong!";
      else reply = `Kamu bilang: ${text}`;

      // Kirim balasan ke Telegram
      await fetch(`${API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
        }),
      });
    }

    return res.status(200).send("OK");
  }

  // Endpoint default jika diakses lewat browser
  res.status(200).send("Bot Telegram sedang berjalan di Vercel ✅");
};