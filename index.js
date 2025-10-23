const { Telegraf, Markup } = require("telegraf")
const fetch = require("node-fetch")

// Library
const { serverStatus } = require("./lib/status")
const AniListAPI = require("./lib/search")
const aniClient = new AniListAPI()

const TOKEN = process.env.BOT_TOKEN
const PREFIX = "/"
const bot = new Telegraf(TOKEN)

// Cache sementara untuk daftar anime per chat
const animeCache = new Map()
const animeIndex = new Map() // Menyimpan index anime aktif per chat

// === Command handler ===
bot.on("message", async (ctx) => {
  const msg = (ctx.message.text || "").trim()
  if (!msg.startsWith(PREFIX)) return

  const args = msg.slice(PREFIX.length).trim().split(/ +/)
  let command = args.shift().toLowerCase()
  if (command.includes("@")) command = command.split("@")[0]
  const text = args.join(" ")

  switch (PREFIX + command) {
    case PREFIX + "help":
    case PREFIX + "menu": {
      ctx.replyWithMarkdown(`👋 Hai

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

        // Simpan daftar anime & index awal
        animeCache.set(ctx.chat.id, animeList)
        animeIndex.set(ctx.chat.id, 0)

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
      break
  }
})

// === Fungsi kirim anime ===
async function sendAnime(ctx, index) {
  const chatId = ctx.chat.id
  const animeList = animeCache.get(chatId)
  if (!animeList) return ctx.reply("❌ Data anime tidak ditemukan.")

  if (index < 0) index = animeList.length - 1
  if (index >= animeList.length) index = 0
  animeIndex.set(chatId, index)

  const anime = animeList[index]

  const text_anime = `
📗Title: ${anime.title.romaji || anime.title.english}
📘Type: ${anime.format || "Unknown"}
📘Genres: ${anime.genres.join(", ")}
`

  const keyboard = Markup.keyboard([
    ["Save"],
    ["⬅️ Previous", "Next ➡️"],
    ["📋 List Character"]
  ])
    .resize()
    .oneTime(false)

  await ctx.replyWithPhoto(
    { url: "https://img.anili.st/media/" + anime.id },
    { caption: text_anime, parse_mode: "Markdown" }
  )

  await ctx.reply("Pilih tindakan:", keyboard)
}

// === Event tombol besar (Reply Keyboard) ===

// Next ➡️
bot.hears("Next ➡️", async (ctx) => {
  const chatId = ctx.chat.id
  let index = animeIndex.get(chatId) ?? 0
  index++
  await sendAnime(ctx, index)
})

// ⬅️ Previous
bot.hears("⬅️ Previous", async (ctx) => {
  const chatId = ctx.chat.id
  let index = animeIndex.get(chatId) ?? 0
  index--
  await sendAnime(ctx, index)
})

// 📋 List Character
bot.hears("📋 List Character", async (ctx) => {
  const chatId = ctx.chat.id
  const index = animeIndex.get(chatId) ?? 0
  const animeList = animeCache.get(chatId)
  const anime = animeList?.[index]
  if (!anime) return ctx.reply("❌ Data anime tidak ditemukan.")

  try {
    const data = await aniClient.searchAnimeById(anime.id)
    const chars = data.characters?.nodes || []

    if (chars.length === 0)
      return ctx.reply("❌ Tidak ada character ditemukan.")

    let charactersText = `🎭 *Characters dari ${anime.title.romaji || anime.title.english}*\n\n`
    chars.slice(0, 10).forEach((c, i) => {
      charactersText += `📗 ${i + 1}. ${c.name.full || c.name.native}\n`
    })

    await ctx.replyWithPhoto(
      { url: chars[0]?.image?.large || "https://img.anili.st/media/" + anime.id },
      { caption: charactersText, parse_mode: "Markdown" }
    )
  } catch (err) {
    console.error(err)
    ctx.reply("⚠️ Gagal mengambil data karakter.")
  }
})

// Save (contoh sederhana)
bot.hears("Save", async (ctx) => {
  const chatId = ctx.chat.id
  const index = animeIndex.get(chatId) ?? 0
  const animeList = animeCache.get(chatId)
  const anime = animeList?.[index]
  if (!anime) return ctx.reply("❌ Tidak ada anime yang disimpan.")

  ctx.reply(`💾 Disimpan: ${anime.title.romaji || anime.title.english}`)
})

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