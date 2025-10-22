const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");

// Library
const AniListAPI = require("./lib/search")
const aniClient = new AniListAPI()

const TOKEN = process.env.BOT_TOKEN;
const PREFIX = "/";
const bot = new Telegraf(TOKEN);

// === Command handler ===
bot.on("message", async (ctx) => {
  const budy = typeof ctx.message.text === "string" ? ctx.message.text : ""
  const body = ctx.message.text || ctx.message.caption || ""
  
  const msg = ctx.message.text.trim();
  if (!msg.startsWith(PREFIX)) return;

  const args = msg.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (PREFIX + command) {
    case PREFIX + "treanime": {
      aniClient.getTrendingAnime().then(animeList => {
            text_anime = ""
            animeList.forEach((anime, index) => {
            text_anime += `
📗Title: ${anime.title.romaji || anime.title.english}
📘Type: ${anime.format ? `${anime.format}` : "Unknown"}
📘Genres: ${anime.genres.join(", ")}
⤗More Info: ${prefix}aid ${anime.id}
`
            })
            text_anime += ""
            await ctx.replyWithPhoto({ url: "https://img.anili.st/media/" + top5[0].id }, { caption: text_anime, parse_mode: "Markdown" });
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