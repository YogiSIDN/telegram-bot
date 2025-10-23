const { Telegraf, Markup } = require("telegraf")
const fetch = require("node-fetch")

// Library
const { serverStatus } = require("./lib/status")
const AniListAPI = require("./lib/search")
const aniClient = new AniListAPI()

const TOKEN = process.env.BOT_TOKEN
const PREFIX = "/"
const bot = new Telegraf(TOKEN)

// Cache sementara untuk daftar trending anime per chat
const animeCache = new Map()

// === Command handler ===
bot.on("message", async (ctx) => {
  const msg = (ctx.message.text || "").trim()
  if (!msg.startsWith(PREFIX)) return

  const args = msg.slice(PREFIX.length).trim().split(/ +/)
  let command = args.shift().toLowerCase() // ← gunakan let agar bisa dimodifikasi
  if (command.includes("@")) command = command.split("@")[0] // hilangkan @NamaBot

  switch (PREFIX + command) {
    case PREFIX + "help":
    case PREFIX + "menu": {
      ctx.reply(`👋 Hai

${PREFIX}status
${PREFIX}treanime

Bot masih dalam tahap pengembangan.`)
      break
    }

    case PREFIX + "status": {
      ctx.reply(serverStatus())
      break
    }

    case PREFIX + "treanime": {
      try {
        const animeList = await aniClient.getTrendingAnime()
        if (!animeList || animeList.length === 0)
          return ctx.reply("💔 Maaf, anime trending tidak ditemukan.")

        // Simpan daftar anime di cache
        animeCache.set(ctx.chat.id, animeList)

        // Kirim anime pertama
        await sendAnime(ctx, 0)
      } catch (err) {
        console.error(err)
        ctx.reply("⚠️ Terjadi kesalahan saat mengambil data anime.")
      }
      break
    }

    default:
      ctx.reply("❌ Perintah tidak dikenal!")
  }
})

// === Fungsi kirim anime ===
async function sendAnime(ctx, index) {
  const chatId = ctx.chat.id
  const animeList = animeCache.get(chatId)
  if (!animeList) return ctx.reply("❌ Data anime tidak ditemukan.")

  // Batasi index agar tetap valid
  if (index < 0) index = animeList.length - 1
  if (index >= animeList.length) index = 0

  const anime = animeList[index]

  let text_anime = `
📗Title: ${anime.title.romaji || anime.title.english}
📘Type: ${anime.format || "Unknown"}
📘Genres: ${anime.genres.join(", ")}
⤗More Info: ${PREFIX}aid ${anime.id}
`

  // Hindari melebihi batas caption
  if (text_anime.length > 1000) text_anime = text_anime.slice(0, 1000) + "…"

  const buttons = Markup.inlineKeyboard([
    [
      Markup.button.callback("⬅️ Previous", `prev_${index}`),
      Markup.button.callback("Next ➡️", `next_${index}`),
    ],
  ])

  await ctx.replyWithPhoto(
    { url: "https://img.anili.st/media/" + anime.id },
    { caption: text_anime, parse_mode: "Markdown", ...buttons }
  )
}

// === Event tombol navigasi ===
bot.on("callback_query", async (ctx) => {
  try {
    const chatId = ctx.chat.id
    const data = ctx.callbackQuery.data
    const animeList = animeCache.get(chatId)
    if (!animeList) return ctx.answerCbQuery("Data anime tidak ditemukan")

    const [action, indexStr] = data.split("_")
    let index = parseInt(indexStr)

    if (action === "next") index++
    else if (action === "prev") index--

    // Koreksi index
    if (index < 0) index = animeList.length - 1
    if (index >= animeList.length) index = 0

    const anime = animeList[index]

    let text_anime = `
📗Title: ${anime.title.romaji || anime.title.english}
📘Type: ${anime.format || "Unknown"}
📘Genres: ${anime.genres.join(", ")}
⤗More Info: ${PREFIX}aid ${anime.id}
`

    if (text_anime.length > 1000) text_anime = text_anime.slice(0, 1000) + "…"

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback("⬅️ Previous", `prev_${index}`),
        Markup.button.callback("Next ➡️", `next_${index}`),
      ],
    ])

    await ctx.editMessageMedia(
      {
        type: "photo",
        media: "https://img.anili.st/media/" + anime.id,
        caption: text_anime,
        parse_mode: "Markdown",
      },
      { reply_markup: buttons.reply_markup } // ← perbaikan penting
    )

    await ctx.answerCbQuery()
  } catch (err) {
    console.error(err)
    ctx.answerCbQuery("⚠️ Gagal memuat anime berikutnya.")
  }
})

// === Escape untuk MarkdownV2 ===
function escape(text = "") {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&")
}

// === Export ke Vercel ===
module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body)
      return res.status(200).send("OK")
    }
    res.status(200).send("Bot Telegraf berjalan di Vercel ✅")
  } catch (err) {
    console.error("Error:", err)
    res.status(500).send("Internal Server Error")
  }
}