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

    // Simpan daftar anime di cache
    animeCache.set(ctx.chat.id, animeList)

    // Kirim anime pertama (1 pesan saja)
    await sendAnime(ctx, 0, true)
  } catch (err) {
    console.error(err)
    ctx.reply("⚠️ Terjadi kesalahan saat mengambil data anime.")
  }
  break
}

default:
  ctx.reply("❌ Perintah tidak dikenal!")
})

// === Fungsi kirim / edit anime ===
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
}

// === Event tombol navigasi dan info ===
bot.on("callback_query", async (ctx) => {
  try {
    const chatId = ctx.chat.id
    const data = ctx.callbackQuery.data
    const animeList = animeCache.get(chatId)
    if (!animeList) return ctx.answerCbQuery("Data anime tidak ditemukan")

    // === Next & Previous ===
    if (data.startsWith("next_") || data.startsWith("prev_")) {
      const [action, indexStr] = data.split("_")
      let index = parseInt(indexStr)
      if (action === "next") index++
      else index--

      await sendAnime(ctx, index)
      return await ctx.answerCbQuery()
    }

    // === List Character ===
    if (data.startsWith("chars_")) {
      const [_, animeId, indexStr] = data.split("_")
      const index = parseInt(indexStr)
      
      try {
        const anime = await aniClient.searchAnimeById(animeId)
        
        if (!anime.characters || !anime.characters.nodes || anime.characters.nodes.length === 0) {
          return ctx.answerCbQuery("❌ Tidak ada character yang ditemukan untuk anime ini.")
        }

        let charactersText = `🎭 *Characters dari ${anime.title.romaji || anime.title.english}*\n\n`
        
        // Ambil maksimal 10 character pertama
        anime.characters.nodes.slice(0, 10).forEach((character, charIndex) => {
          charactersText += `📗 ${charIndex + 1}. ${character.name.full || character.name.native}\n`
          charactersText += `📘 ID: ${character.id}\n`
          charactersText += `⤗ More Info: ${prefix}charid ${character.id}\n`
          charactersText += "━━━━━━━━━━━━━━━━━━━━\n"
        })

        if (anime.characters.nodes.length > 10) {
          charactersText += `\n📋 ...dan ${anime.characters.nodes.length - 10} character lainnya`
        }

        const backButton = Markup.inlineKeyboard([
          [Markup.button.callback("⬅️ Back to Anime", `back_${index}`)]
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

    // === More Info (jika masih ingin mempertahankan) ===
    if (data.startsWith("info_")) {
      const [_, animeId, indexStr] = data.split("_")
      const anime = await aniClient.searchAnimeById(animeId)

      let animeId_text = `
📗Title: ${anime.title.romaji || anime.title.english}
📘Genres: ${anime.genres.join(", ")}
📙Episode: ${anime.episodes || "0"}
📙Type: ${anime.format || "Unknown"}
↹Status: ${anime.status}
↛Aired: ${anime.startDate?.year || "-"}
↯Rating: ${anime.averageScore ? `${anime.averageScore}%` : "-"}
🕒Duration: ${anime.duration ? `${anime.duration} Minutes` : "-"}
⤗Season: ${anime.season || "-"} ${anime.seasonYear || ""}
💫Adaption: ${anime.source}
📙Synopsis: ${anime.description?.replace(/<br>|<i>|<\/i>|<\/?b>/g, "") || "-"}
`

      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Back", `back_${indexStr}`)],
      ])

      await ctx.editMessageMedia(
        {
          type: "photo",
          media: "https://img.anili.st/media/" + anime.id,
          caption: animeId_text,
          parse_mode: "Markdown",
        },
        { reply_markup: buttons.reply_markup }
      )
      return await ctx.answerCbQuery()
    }

    // === Back ===
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