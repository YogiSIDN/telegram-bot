const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");

const TOKEN = process.env.BOT_TOKEN;
const PREFIX = "/";
const bot = new Telegraf(TOKEN);

// === Helper: ambil data trending anime dari AniList ===
async function getTrendingAnime() {
  const query = `
  query {
    Page(perPage: 10) {
      media(sort: TRENDING_DESC, type: ANIME) {
        id
        title {
          romaji
          english
        }
        format
        genres
      }
    }
  }`;

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query })
  });

  const data = await response.json();
  return data.data.Page.media;
}

// === Command handler mirip Baileys ===
bot.on("text", async (ctx) => {
  const message = ctx.message.text.trim();
  if (!message.startsWith(PREFIX)) return;

  const args = message.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (PREFIX + command) {
    case PREFIX + "treanime": {
      try {
        // Ambil data anime trending
        const animeList = await getTrendingAnime();

        let textAnime = "";
        animeList.forEach((anime, index) => {
          textAnime += `
📗 Title: ${anime.title.romaji || anime.title.english}
📘 Type: ${anime.format || "Unknown"}
📘 Genres: ${anime.genres.join(", ")}
⤗ More Info: ${PREFIX}aid ${anime.id}
`;
        });

        // Kirim pesan dengan gambar anime pertama
        await ctx.replyWithPhoto(
          { url: "https://img.anili.st/media/" + animeList[0].id },
          { caption: textAnime }
        );
      } catch (err) {
        console.error(err);
        ctx.reply("💔 Maaf, anime trending tidak ditemukan.");
      }
      break;
    }

    default:
      ctx.reply("❌ Perintah tidak dikenal!");
  }
});

// === Export handler untuk Vercel ===
module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    }
    res.status(200).send("Bot Telegraf sedang berjalan di Vercel ✅");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
};