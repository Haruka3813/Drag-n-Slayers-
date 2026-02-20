require('dotenv').config();
const express = require("express");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

// Verificación de token
if (!process.env.TOKEN) {
  console.log("❌ TOKEN no encontrado en Environment Variables");
  process.exit(1);
}

// Inicialización del bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Servidor web simple para Render
const app = express();
app.get("/", (req, res) => res.send("Fairy Slayers activo"));
app.listen(10000, () => console.log("Servidor web activo en puerto 10000"));

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Discord App Client ID
const CLIENT_ID = process.env.CLIENT_ID;

// Comandos slash
const commands = [
  new SlashCommandBuilder()
    .setName("elegirmagia")
    .setDescription("Elige tu magia")
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
    .setDescription("Ver tu perfil"),
  new SlashCommandBuilder()
    .setName("batalla")
    .setDescription("Buscar enemigo"),
  new SlashCommandBuilder()
    .setName("betatester")
    .setDescription("Recompensa beta"),
  new SlashCommandBuilder()
    .setName("miau")
    .setDescription("Recibir mascota inicial"),
  new SlashCommandBuilder()
    .setName("ayuda")
    .setDescription("Ver comandos")
].map(cmd => cmd.toJSON());

// Registro de comandos
client.once("clientReady", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("✅ Comandos slash registrados");
});

// Interacciones
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  // =========================
  // /ELEGIRMAGIA
  // =========================
  if (interaction.commandName === "elegirmagia") {
    const magia = interaction.options.getString("tipo");

    try {
      const { data, error } = await supabase
        .from("personajes")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log("❌ Error al buscar personaje:", error);
        return interaction.reply("Error al buscar personaje. Revisa la consola.");
      }

      if (data) return interaction.reply("Ya tienes personaje creado.");

      const { data: insertData, error: insertError } = await supabase
        .from("personajes")
        .insert({
          id: userId,
          magia,
          nivel: 1,
          xp: 0,
          oro: 0,
          vida: 500,
          maxvida: 500,
          lastbatalla: Date.now()
        });

      if (insertError) {
        console.log("❌ Error insert personaje:", insertError);
        return interaction.reply("Error al crear personaje, revisa la consola.");
      }

      return interaction.reply(`✨ Personaje creado con magia ${magia}. Vida 500.`);

    } catch (err) {
      console.log("❌ Excepción elegirmagia:", err);
      return interaction.reply("Error inesperado al crear personaje.");
    }
  }

  // =========================
  // /INFO
  // =========================
  if (interaction.commandName === "info") {
    try {
      const { data, error } = await supabase
        .from("personajes")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) return interaction.reply("No tienes personaje.");

      return interaction.reply(
        `📜 **Perfil**
Magia: ${data.magia}
Nivel: ${data.nivel}
XP: ${data.xp}
Oro: ${data.oro}
Vida: ${data.vida}/${data.maxvida}`
      );

    } catch (err) {
      console.log("❌ Excepción info:", err);
      return interaction.reply("Error inesperado al mostrar perfil.");
    }
  }

  // =========================
  // /BATALLA
  // =========================
  if (interaction.commandName === "batalla") {
    try {
      const { data, error } = await supabase
        .from("personajes")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) return interaction.reply("No tienes personaje.");

      let nuevaVida = data.vida - 100;
      if (nuevaVida < 0) nuevaVida = 0;

      const { error: updateError } = await supabase
        .from("personajes")
        .update({
          vida: nuevaVida,
          xp: data.xp + 100,
          oro: data.oro + 50,
          lastbatalla: Date.now()
        })
        .eq("id", userId);

      if (updateError) {
        console.log("❌ Error actualizar batalla:", updateError);
        return interaction.reply("Error al completar batalla.");
      }

      return interaction.reply(
        `⚔️ Batalla completada!
+100 XP
+50 Oro
Vida restante: ${nuevaVida}`
      );

    } catch (err) {
      console.log("❌ Excepción batalla:", err);
      return interaction.reply("Error inesperado en batalla.");
    }
  }

  // =========================
  // /BETATESTER
  // =========================
  if (interaction.commandName === "betatester") {
    try {
      const { error } = await supabase
        .from("personajes")
        .update({
          xp: 3000,
          oro: 5000
        })
        .eq("id", userId);

      if (error) {
        console.log("❌ Error betatester:", error);
        return interaction.reply("Error al aplicar recompensa beta.");
      }

      return interaction.reply("🎁 Recompensa beta aplicada.");

    } catch (err) {
      console.log("❌ Excepción betatester:", err);
      return interaction.reply("Error inesperado en betatester.");
    }
  }

  // =========================
  // /MIAU
  // =========================
  if (interaction.commandName === "miau") {
    return interaction.reply("🐾 Has recibido tu mascota UR inicial.");
  }

  // =========================
  // /AYUDA
  // =========================
  if (interaction.commandName === "ayuda") {
    return interaction.reply(
`📘 Fairy Slayers

/elegirmagia
/info
/batalla
/betatester
/miau`
    );
  }
});

// Login bot
client.login(process.env.TOKEN);
