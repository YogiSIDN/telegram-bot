const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");

const TOKEN = process.env.BOT_TOKEN;
const PREFIX = "/";
const bot = new Telegraf(TOKEN);

// === Ambil anime trending (max 5) ===
async function getTrendingAnime() {
  const query = `
  query {
    Page(perPage: 5) {
      media(sort: TRENDING_DESC, type: ANIME) {
        id
        title {
          romaji
          english
        }
        format
        genres
        coverImage {
          large
        }
      }
    }
  }`;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  if (!data.data) throw new Error("Gagal mengambil data dari AniList");
  return data.data.Page.media;
}

// === Command handler ===
bot.on("text", async (ctx) => {
  const msg = ctx.message.text.trim();
  if (!msg.startsWith(PREFIX)) return;

  const args = msg.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (PREFIX + command) {
    case PREFIX + "treanime": {
      try {
        const animeList = await getTrendingAnime();

        if (!animeList || animeList.length === 0) {
          return ctx.reply("💔 Tidak ada anime trending ditemukan.");
        }

        // Ambil 5 anime
        let caption = "🔥 *Top 5 Anime Trending Saat Ini:*\n\n";
        animeList.forEach((anime, i) => {
          caption += `${i + 1}. *${escape(
            anime.title.romaji || anime.title.english
          )}*\n`;
          caption += `📘 Type: ${escape(anime.format || "Unknown")}\n`;
          caption += `📚 Genres: ${escape(anime.genres.join(", "))}\n`;
          caption += `🔗 More Info: ${PREFIX}aid ${anime.id}\n\n`;
        });

        // Kirim dengan gambar anime pertama
        await ctx.replyWithPhoto(
          { url: animeList[0].coverImage.large },
          { caption, parse_mode: "MarkdownV2" }
        );
      } catch (err) {
        console.error("Error:", err);
        ctx.reply("💔 Terjadi kesalahan saat mengambil data anime.");
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