const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");

// Library
const AniListAPI = require("./lib/search");
const aniClient = new AniListAPI();

const TOKEN = process.env.BOT_TOKEN;
const PREFIX = "/";
const bot = new Telegraf(TOKEN);

// === Command handler ===
bot.on("message", async (ctx) => {
  const msg = (ctx.message.text || "").trim();
  if (!msg.startsWith(PREFIX)) return;

  const args = msg.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (PREFIX + command) {
    case PREFIX + "treanime": {
      try {
        const animeList = await aniClient.getTrendingAnime();
        if (!animeList || animeList.length === 0)
          return ctx.reply("💔 Maaf, anime trending tidak ditemukan.");

        let text_anime = "";
        animeList.forEach((anime) => {
          text_anime += `
📗Title: ${anime.title.romaji || anime.title.english}
📘Type: ${anime.format || "Unknown"}
📘Genres: ${anime.genres.join(", ")}
⤗More Info: ${PREFIX}aid ${anime.id}
`;
        });

        const top = animeList[0];
        await ctx.replyWithPhoto(
          { url: "https://img.anili.st/media/" + top.id },
          { caption: text_anime, parse_mode: "Markdown" }
        );
      } catch (err) {
        console.error(err);
        ctx.reply("⚠️ Terjadi kesalahan saat mengambil data anime.");
      }
      break;
    }

    default:
      ctx.reply("❌ Perintah tidak dikenal!");
  }
});

// === Escape untuk MarkdownV2 ===
function escape(text = "") {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// === Export ke Vercel ===
module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    }
    res.status(200).send("Bot Telegraf berjalan di Vercel ✅");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
};