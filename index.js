const { Telegraf, Markup } = require("telegraf")
const fetch = require("node-fetch")

// Library
const { serverStatus } = require("./lib/status")
const AniListAPI = require("./lib/search")
const aniClient = new AniListAPI()

const TOKEN = process.env.BOT_TOKEN
const PREFIX = "/"
const bot = new Telegraf(TOKEN)

// Cache sementara
const animeCache = new Map()

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

        animeCache.set(ctx.chat.id, animeList)
        await sendAnime(ctx, 0, true)
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

// === Fungsi kirim/edit anime ===
async function sendAnime(ctx, index, isNew = false) {
  const chatId = ctx.chat.id
  const animeList = animeCache.get(chatId)
  if (!animeList) return ctx.reply("❌ Data anime tidak ditemukan.")

  if (index < 0) index = animeList.length - 1
  if (index >= animeList.length) index = 0

  const anime = animeList[index]

  let text_anime = `
📗Title: ${anime.title.romaji || anime.title.english}
📘Type: ${anime.format || "Unknown"}
📘Genres: ${anime.genres.join(", ")}
`

  const buttons = Markup.inlineKeyboard([
    [
      Markup.button.callback("⬅️ Previous", `prev_${index}`),
      Markup.button.callback("📋 List Character", `chars_${anime.id}_${index}`),
      Markup.button.callback("Next ➡️", `next_${index}`),
    ],
  ])

  try {
    if (isNew) {
      await ctx.replyWithPhoto(
        { url: "https://img.anili.st/media/" + anime.id },
        { caption: text_anime, parse_mode: "Markdown", ...buttons }
      )
    } else {
      await ctx.editMessageMedia(
        {
          type: "photo",
          media: "https://img.anili.st/media/" + anime.id,
          caption: text_anime,
          parse_mode: "Markdown",
        },
        { reply_markup: buttons.reply_markup }
      )
    }
  } catch (err) {
    console.error("Edit failed, sending new:", err)
    await ctx.replyWithPhoto(
      { url: "https://img.anili.st/media/" + anime.id },
      { caption: text_anime, parse_mode: "Markdown", ...buttons }
    )
  }
}

// === Callback tombol ===
bot.on("callback_query", async (ctx) => {
  try {
    const chatId = ctx.chat.id
    const data = ctx.callbackQuery.data
    const animeList = animeCache.get(chatId)
    if (!animeList) return ctx.answerCbQuery("Data anime tidak ditemukan")

    if (data.startsWith("next_") || data.startsWith("prev_")) {
      const [action, indexStr] = data.split("_")
      let index = parseInt(indexStr)
      if (action === "next") index++
      else index--
      await sendAnime(ctx, index)
      return await ctx.answerCbQuery()
    }

    if (data.startsWith("chars_")) {
      const [_, animeId, indexStr] = data.split("_")
      const index = parseInt(indexStr)
      try {
        const anime = await aniClient.searchAnimeById(animeId)
        if (!anime.characters?.nodes?.length)
          return ctx.answerCbQuery("❌ Tidak ada character yang ditemukan.")

        let charactersText = `🎭 *Characters dari ${anime.title.romaji || anime.title.english}*\n\n`
        anime.characters.nodes.slice(0, 10).forEach((c, i) => {
          charactersText += `📗 ${i + 1}. ${c.name.full || c.name.native}\n`
          charactersText += `📘 ID: ${c.id}\n`
          charactersText += `⤗ More Info: ${PREFIX}charid ${c.id}\n`
          charactersText += "━━━━━━━━━━━━━━━━━━━━\n"
        })

        const backButton = Markup.inlineKeyboard([
          [Markup.button.callback("⬅️ Back to Anime", `back_${index}`)],
        ])

        await ctx.editMessageMedia(
          {
            type: "photo",
            media: anime.characters.nodes[0]?.image?.large || "https://img.anili.st/media/" + anime.id,
            caption: charactersText,
            parse_mode: "Markdown",
          },
          { reply_markup: backButton.reply_markup }
        )
      } catch (error) {
        console.error(error)
        ctx.answerCbQuery("❌ Gagal mengambil data character.")
      }
      return await ctx.answerCbQuery()
    }

    if (data.startsWith("back_")) {
      const index = parseInt(data.split("_")[1])
      await sendAnime(ctx, index)
      return await ctx.answerCbQuery()
    }

  } catch (err) {
    console.error(err)
    ctx.answerCbQuery("⚠️ Terjadi kesalahan.")
  }
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