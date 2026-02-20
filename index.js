import express from "express";
import dotenv from "dotenv";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

/* ==========================
   VALIDACIÓN DE VARIABLES
========================== */

if (!process.env.TOKEN) {
  console.error("❌ TOKEN no encontrado en Environment Variables");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error("❌ CLIENT_ID no encontrado en Environment Variables");
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("❌ Supabase no configurado");
  process.exit(1);
}

/* ==========================
   EXPRESS (para Render)
========================== */

const app = express();
app.get("/", (req, res) => {
  res.send("Fairy Slayers activo 🔥");
});
app.listen(10000, () => console.log("Servidor web activo en puerto 10000"));

/* ==========================
   SUPABASE
========================== */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* ==========================
   DISCORD CLIENT
========================== */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

/* ==========================
   SLASH COMMANDS
========================== */

const commands = [
  new SlashCommandBuilder()
    .setName("elegirmagia")
    .setDescription("Elige tu magia inicial")
    .addStringOption(option =>
      option.setName("tipo")
        .setDescription("Tipo de magia")
        .setRequired(true)
        .addChoices(
          { name: "Dragón Slayer", value: "dragon" },
          { name: "Celestial", value: "celestial" },
          { name: "Oscura", value: "oscura" }
        )
    ),

  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Ver tu perfil"),

  new SlashCommandBuilder()
    .setName("betatester")
    .setDescription("Recompensa especial beta tester"),

  new SlashCommandBuilder()
    .setName("ayuda")
    .setDescription("Lista de comandos")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Registrando comandos...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Comandos slash registrados");
  } catch (error) {
    console.error(error);
  }
})();

/* ==========================
   INTERACCIONES
========================== */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  /* ========= ELEGIR MAGIA ========= */

  if (interaction.commandName === "elegirmagia") {
    const magia = interaction.options.getString("tipo");

    const { data: existing } = await supabase
      .from("jugadores")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existing) {
      return interaction.reply({
        content: "❌ Ya tienes una magia elegida.",
        ephemeral: true
      });
    }

    await supabase.from("jugadores").insert({
      user_id: userId,
      magia: magia,
      nivel: 1,
      xp: 0,
      oro: 0,
      vida: 500,
      vida_max: 500,
      ultima_accion: Date.now()
    });

    return interaction.reply(`🔥 Magia ${magia} elegida correctamente!`);
  }

  /* ========= INFO ========= */

  if (interaction.commandName === "info") {
    const { data } = await supabase
      .from("jugadores")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!data) {
      return interaction.reply({
        content: "❌ No tienes personaje. Usa /elegirmagia primero.",
        ephemeral: true
      });
    }

    return interaction.reply(`
📜 **Perfil de ${interaction.user.username}**

🔮 Magia: ${data.magia}
⭐ Nivel: ${data.nivel}
✨ XP: ${data.xp}
💰 Oro: ${data.oro}
❤️ Vida: ${data.vida}/${data.vida_max}
    `);
  }

  /* ========= BETA TESTER ========= */

  if (interaction.commandName === "betatester") {
    const { data } = await supabase
      .from("jugadores")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!data) {
      return interaction.reply({
        content: "❌ Primero crea personaje con /elegirmagia",
        ephemeral: true
      });
    }

    await supabase
      .from("jugadores")
      .update({
        xp: data.xp + 3000,
        oro: data.oro + 5000
      })
      .eq("user_id", userId);

    return interaction.reply("🎁 Recompensa Beta Tester recibida!");
  }

  /* ========= AYUDA ========= */

  if (interaction.commandName === "ayuda") {
    return interaction.reply(`
📘 **Comandos disponibles**

/elegirmagia → Crear personaje
/info → Ver perfil
/betatester → Recompensa especial
/ayuda → Ver comandos
    `);
  }
});

/* ==========================
   LOGIN
========================== */

client.login(process.env.TOKEN);
