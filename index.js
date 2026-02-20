
require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const app = express();
app.get("/", (req, res) => res.send("Fairy Slayers activo"));
app.listen(10000, () => console.log("Servidor web activo"));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const players = new Map(); // Guardado en memoria (fase 1)

const magiasDisponibles = [
  "Dragon Slayer",
  "Mago Celestial",
  "Mago Elemental"
];

client.once("ready", async () => {
  console.log(`Conectado como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("elegirmagia")
      .setDescription("Elige tu magia inicial")
      .addStringOption(option =>
        option.setName("magia")
          .setDescription("Tipo de magia")
          .setRequired(true)
          .addChoices(
            { name: "Dragon Slayer", value: "Dragon Slayer" },
            { name: "Mago Celestial", value: "Mago Celestial" },
            { name: "Mago Elemental", value: "Mago Elemental" }
          )
      ),

    new SlashCommandBuilder()
      .setName("info")
      .setDescription("Ver información de tu personaje"),

    new SlashCommandBuilder()
      .setName("ayuda")
      .setDescription("Mostrar comandos disponibles")
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log("Comandos registrados");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  if (interaction.commandName === "elegirmagia") {

    if (players.has(userId)) {
      return interaction.reply("❌ Ya tienes un personaje creado.");
    }

    const magia = interaction.options.getString("magia");

    players.set(userId, {
      nivel: 1,
      xp: 0,
      oro: 0,
      vida: 500,
      magia: magia
    });

    interaction.reply(`✨ Personaje creado como **${magia}**
❤️ Vida: 500
📊 Nivel: 1
💰 Oro: 0`);
  }

  if (interaction.commandName === "info") {

    if (!players.has(userId)) {
      return interaction.reply("❌ Primero usa /elegirmagia");
    }

    const p = players.get(userId);

    interaction.reply(`📜 **Tu personaje**
✨ Magia: ${p.magia}
📊 Nivel: ${p.nivel}
⭐ XP: ${p.xp}
💰 Oro: ${p.oro}
❤️ Vida: ${p.vida}`);
  }

  if (interaction.commandName === "ayuda") {
    interaction.reply(`📖 **Comandos disponibles**
/elegirmagia → Crear personaje
/info → Ver stats
/ayuda → Mostrar comandos`);
  }
});

client.login(process.env.TOKEN);
