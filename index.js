const { Telegraf } = require("telegraf");

const TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(TOKEN);

// === Handler command ===
bot.start((ctx) => ctx.reply("Halo! 👋 Bot Telegraf di Vercel siap!"));
bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));
bot.on("text", (ctx) => ctx.reply(`Kamu bilang: ${ctx.message.text}`));

// === Export ke Vercel ===
module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    }

    res.status(200).send("🤖 Bot Telegraf sedang berjalan di Vercel!");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
};