const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const express = require("express");
require("dotenv").config();

// ===== SERVIDOR WEB (para Render) =====
const app = express();
app.get("/", (req, res) => {
  res.send("Fairy Slayers activo 🧙‍♂️");
});
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web activo");
});

// ===== VERIFICAR TOKEN =====
if (!process.env.TOKEN) {
  console.error("❌ TOKEN no encontrado en Environment Variables");
  process.exit(1);
}

console.log("🔑 Token detectado");

// ===== CLIENTE DISCORD =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== SISTEMA DE JUGADORES (FASE 1) =====
const jugadores = new Map();

// ===== COMANDOS =====
const commands = [
  new SlashCommandBuilder()
    .setName("elegirmagia")
    .setDescription("Elige tu tipo de magia")
    .addStringOption(option =>
      option.setName("tipo")
        .setDescription("Tipo de magia")
        .setRequired(true)
        .addChoices(
          { name: "Dragón Slayer", value: "dragon" },
          { name: "Mago Celestial", value: "celestial" },
          { name: "Mago Oscuro", value: "oscuro" }
        )
    ),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Ver información")
    .addStringOption(option =>
      option.setName("tipo")
        .setDescription("Tipo")
        .setRequired(true)
        .addChoices(
          { name: "personaje", value: "personaje" }
        )
    ),

  new SlashCommandBuilder()
    .setName("ayuda")
    .setDescription("Mostrar comandos")
];

// ===== REGISTRAR COMANDOS =====
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Comandos slash registrados");
  } catch (error) {
    console.error("Error registrando comandos:", error);
  }
})();

// ===== EVENTO READY =====
client.once("ready", () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
});

// ===== INTERACCIONES =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  // CREAR PERSONAJE
  if (interaction.commandName === "elegirmagia") {
    if (jugadores.has(userId)) {
      return interaction.reply("⚠️ Ya tienes un personaje creado.");
    }

    const tipo = interaction.options.getString("tipo");

    jugadores.set(userId, {
      magia: tipo,
      nivel: 1,
      xp: 0,
      oro: 0,
      vida: 500,
      vidaMax: 500
    });

    return interaction.reply(`✨ Personaje creado con magia **${tipo}** y 500 de vida.`);
  }

  // INFO PERSONAJE
  if (interaction.commandName === "info") {
    const jugador = jugadores.get(userId);

    if (!jugador) {
      return interaction.reply("❌ No tienes personaje. Usa /elegirmagia");
    }

    return interaction.reply(`
📜 **Tu Personaje**
Magia: ${jugador.magia}
Nivel: ${jugador.nivel}
XP: ${jugador.xp}
Oro: ${jugador.oro}
Vida: ${jugador.vida}/${jugador.vidaMax}
    `);
  }

  // AYUDA
  if (interaction.commandName === "ayuda") {
    return interaction.reply(`
📖 **Fairy Slayers**
/elegirmagia
/info personaje
/ayuda
    `);
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
