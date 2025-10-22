const { Telegraf, Markup } = require("telegraf");
const fetch = require("node-fetch");

const TOKEN = process.env.BOT_TOKEN;
const PREFIX = "!";
const bot = new Telegraf(TOKEN);

// Cache sementara per chat
const trendingCache = new Map();

// === Fungsi ambil data trending anime ===
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
        coverImage {
          large
        }
      }
    }
  }`;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  if (!data.data) throw new Error("Gagal ambil data anime");
  return data.data.Page.media;
}

// === Handler utama ===
bot.on("text", async (ctx) => {
  const message = ctx.message.text.trim();
  if (!message.startsWith(PREFIX)) return;

  const args = message.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (PREFIX + command) {
    case PREFIX + "treanime": {
      try {
        const animeList = await getTrendingAnime();
        if (!animeList || animeList.length === 0)
          return ctx.reply("💔 Maaf, anime trending tidak ditemukan.");

        // Simpan cache
        trendingCache.set(ctx.chat.id, { list: animeList, index: 0 });

        const anime = animeList[0];
        const caption = [
          `📗 *Title:* ${escape(anime.title.romaji || anime.title.english)}`,
          `📘 *Type:* ${escape(anime.format || "Unknown")}`,
          `📘 *Genres:* ${escape(anime.genres.join(", "))}`,
          `⤗ *More Info:* ${PREFIX}aid ${anime.id}`,
        ].join("\n");

        await ctx.replyWithPhoto(
          { url: anime.coverImage.large },
          {
            caption,
            parse_mode: "MarkdownV2",
            reply_markup: Markup.inlineKeyboard([
              [
                Markup.button.callback("⏮ Prev", "prev_anime"),
                Markup.button.callback("Next ⏭", "next_anime"),
              ],
            ]),
          }
        );
      } catch (err) {
        console.error("Error:", err);
        ctx.reply("💔 Maaf, anime trending tidak ditemukan.");
      }
      break;
    }

    default:
      ctx.reply("❌ Perintah tidak dikenal!");
  }
});

// === Tombol Navigasi ===
bot.action(["next_anime", "prev_anime"], async (ctx) => {
  try {
    const cache = trendingCache.get(ctx.chat.id);
    if (!cache) return ctx.answerCbQuery("⚠️ Data anime tidak ditemukan.");

    let { list, index } = cache;
    if (ctx.callbackQuery.data === "next_anime") index++;
    else index--;

    if (index < 0) index = list.length - 1;
    if (index >= list.length) index = 0;

    const anime = list[index];
    trendingCache.set(ctx.chat.id, { list, index });

    const caption = [
      `📗 *Title:* ${escape(anime.title.romaji || anime.title.english)}`,
      `📘 *Type:* ${escape(anime.format || "Unknown")}`,
      `📘 *Genres:* ${escape(anime.genres.join(", "))}`,
      `⤗ *More Info:* ${PREFIX}aid ${anime.id}`,
    ].join("\n");

    await ctx.editMessageMedia(
      {
        type: "photo",
        media: anime.coverImage.large,
        caption,
        parse_mode: "MarkdownV2",
      },
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⏮ Prev", callback_data: "prev_anime" },
              { text: "Next ⏭", callback_data: "next_anime" },
            ],
          ],
        },
      }
    );

    await ctx.answerCbQuery();
  } catch (err) {
    console.error("Button error:", err);
    ctx.answerCbQuery("Terjadi kesalahan tombol.");
  }
});

// === Escape text biar aman untuk MarkdownV2 ===
function escape(text = "") {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// === Export untuk Vercel ===
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