require("dotenv").config()
const express = require("express")
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js")
const { createClient } = require("@supabase/supabase-js")

// ===== SUPABASE =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// ===== DISCORD =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

const app = express()
app.get("/", (req, res) => res.send("Bot activo"))
app.listen(10000, () => console.log("Servidor web activo"))

// ===== COMANDOS =====
const commands = [
  new SlashCommandBuilder()
    .setName("elegirmagia")
    .setDescription("Elige tu magia")
    .addStringOption(option =>
      option.setName("tipo")
        .setDescription("Tipo de magia")
        .setRequired(true)
        .addChoices(
          { name: "Dragon Slayer", value: "Dragon Slayer" },
          { name: "Celestial", value: "Celestial" }
        )
    ),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Ver tu personaje")
].map(cmd => cmd.toJSON())

// ===== REGISTRAR COMANDOS =====
client.once("clientReady", async () => {
  console.log(`Conectado como ${client.user.tag}`)

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN)

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  )

  console.log("Comandos registrados")
})

// ===== INTERACCIONES =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return

  const userId = interaction.user.id

  // ===== ELEGIR MAGIA =====
  if (interaction.commandName === "elegirmagia") {
    const magia = interaction.options.getString("tipo")

    const { data: existente } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single()

    if (existente) {
      return interaction.reply("❌ Ya tienes personaje creado.")
    }

    const { error } = await supabase
      .from("usuarios")
      .insert([
        {
          id: userId,
          magia: magia,
          nivel: 1,
          xp: 0,
          oro: 0,
          vida: 500,
          max_vida: 500
        }
      ])

    if (error) {
      console.log(error)
      return interaction.reply("❌ Error creando personaje.")
    }

    return interaction.reply(`✨ Personaje creado con magia ${magia}`)
  }

  // ===== INFO =====
  if (interaction.commandName === "info") {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single()

    if (!data) {
      return interaction.reply("❌ No tienes personaje. Usa /elegirmagia")
    }

    return interaction.reply(
      `📜 Personaje:\n` +
      `Magia: ${data.magia}\n` +
      `Nivel: ${data.nivel}\n` +
      `XP: ${data.xp}\n` +
      `Oro: ${data.oro}\n` +
      `Vida: ${data.vida}/${data.max_vida}`
    )
  }
})

client.login(process.env.TOKEN)
