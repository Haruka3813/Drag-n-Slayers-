require('dotenv').config();
const express = require("express");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

if (!process.env.TOKEN) {
  console.log("❌ TOKEN no encontrado en Environment Variables");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const app = express();
app.get("/", (req, res) => res.send("Fairy Slayers activo"));
app.listen(10000, () => console.log("Servidor web activo en puerto 10000"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const CLIENT_ID = process.env.CLIENT_ID;

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

client.once("clientReady", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("✅ Comandos slash registrados");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  // =========================
  // ELEGIR MAGIA
  // =========================
  if (interaction.commandName === "elegirmagia") {
    const magia = interaction.options.getString("tipo");

    const { data } = await supabase
      .from("personajes")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      return interaction.reply("Ya tienes personaje creado.");
    }

    await supabase.from("personajes").insert({
      id: userId,
      magia,
      nivel: 1,
      xp: 0,
      oro: 0,
      vida: 500,
      maxvida: 500,
      lastbatalla: Date.now()
    });

    return interaction.reply(`✨ Personaje creado con magia ${magia}. Vida 500.`);
  }

  // =========================
  // INFO
  // =========================
  if (interaction.commandName === "info") {
    const { data } = await supabase
      .from("personajes")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data) return interaction.reply("No tienes personaje.");

    return interaction.reply(
      `📜 **Perfil**
Magia: ${data.magia}
Nivel: ${data.nivel}
XP: ${data.xp}
Oro: ${data.oro}
Vida: ${data.vida}/${data.maxvida}`
    );
  }

  // =========================
  // BATALLA
  // =========================
  if (interaction.commandName === "batalla") {
    const { data } = await supabase
      .from("personajes")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data) return interaction.reply("No tienes personaje.");

    let nuevaVida = data.vida - 100;
    if (nuevaVida < 0) nuevaVida = 0;

    await supabase.from("personajes")
      .update({
        vida: nuevaVida,
        xp: data.xp + 100,
        oro: data.oro + 50,
        lastbatalla: Date.now()
      })
      .eq("id", userId);

    return interaction.reply(
      `⚔️ Batalla completada!
+100 XP
+50 Oro
Vida restante: ${nuevaVida}`
    );
  }

  // =========================
  // BETATESTER
  // =========================
  if (interaction.commandName === "betatester") {
    await supabase.from("personajes")
      .update({
        xp: 3000,
        oro: 5000
      })
      .eq("id", userId);

    return interaction.reply("🎁 Recompensa beta aplicada.");
  }

  // =========================
  // MIAU
  // =========================
  if (interaction.commandName === "miau") {
    return interaction.reply("🐾 Has recibido tu mascota UR inicial.");
  }

  // =========================
  // AYUDA
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

client.login(process.env.TOKEN);
