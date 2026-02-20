require("dotenv").config();

const express = require("express");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

// =======================
// EXPRESS (ANTI PORT ERROR)
// =======================

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("MMO Bot activo 🚀");
});

app.listen(PORT, () => {
  console.log("Servidor web activo en puerto " + PORT);
});

// =======================
// DISCORD + SUPABASE
// =======================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const CLIENT_ID = process.env.CLIENT_ID;

// =======================
// FUNCIONES MMO
// =======================

function dañoBase() {
  return 15;
}

function enemigoIA(nivel) {
  return {
    nombre: "Enemigo Salvaje",
    vida: 50 + nivel * 20,
    daño: 10 + nivel * 3
  };
}

// =======================
// COMANDOS
// =======================

const commands = [

  new SlashCommandBuilder()
    .setName("crear")
    .setDescription("Crear personaje")
    .addStringOption(o =>
      o.setName("clase")
        .setDescription("Clase")
        .setRequired(true)
        .addChoices(
          { name: "Guerrero", value: "Guerrero" },
          { name: "Mago", value: "Mago" },
          { name: "Arquero", value: "Arquero" }
        )
    ),

  new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Ver perfil"),

  new SlashCommandBuilder()
    .setName("combatir")
    .setDescription("Combatir enemigo"),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Ver oro y banco"),

  new SlashCommandBuilder()
    .setName("depositar")
    .setDescription("Depositar al banco")
    .addIntegerOption(o =>
      o.setName("cantidad")
        .setDescription("Cantidad")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("retirar")
    .setDescription("Retirar del banco")
    .addIntegerOption(o =>
      o.setName("cantidad")
        .setDescription("Cantidad")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Top ranking")

].map(c => c.toJSON());

// =======================
// READY
// =======================

client.once("ready", async () => {
  console.log("Bot activo como " + client.user.tag);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("Comandos registrados correctamente");
});

// =======================
// INTERACCIONES
// =======================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  // ===== CREAR =====
  if (interaction.commandName === "crear") {

    const clase = interaction.options.getString("clase");

    const { data: existe } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (existe) {
      return interaction.reply("Ya tienes personaje.");
    }

    await supabase.from("players").insert({
      id: userId,
      clase,
      nivel: 1,
      xp: 0,
      oro: 100,
      banco: 0,
      vida: 100,
      mana: 50
    });

    return interaction.reply("Personaje creado como " + clase);
  }

  // ===== PERFIL =====
  if (interaction.commandName === "perfil") {

    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data) return interaction.reply("No tienes personaje.");

    return interaction.reply(
`📜 PERFIL
Clase: ${data.clase}
Nivel: ${data.nivel}
XP: ${data.xp}
Vida: ${data.vida}
Oro: ${data.oro}
Banco: ${data.banco}`
    );
  }

  // ===== COMBATIR =====
  if (interaction.commandName === "combatir") {

    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data) return interaction.reply("No tienes personaje.");

    const enemigo = enemigoIA(data.nivel);

    let vidaJugador = data.vida;
    let vidaEnemigo = enemigo.vida;

    while (vidaJugador > 0 && vidaEnemigo > 0) {
      vidaEnemigo -= dañoBase();
      vidaJugador -= enemigo.daño;
    }

    if (vidaJugador <= 0) {
      await supabase.from("players")
        .update({ vida: 100 })
        .eq("id", userId);

      return interaction.reply("Perdiste la batalla.");
    }

    const xpGanada = 100;
    const oroGanado = 50;

    await supabase.from("players")
      .update({
        xp: data.xp + xpGanada,
        oro: data.oro + oroGanado
      })
      .eq("id", userId);

    return interaction.reply(
`Ganaste la batalla!
+${xpGanada} XP
+${oroGanado} oro`
    );
  }

  // ===== BALANCE =====
  if (interaction.commandName === "balance") {

    const { data } = await supabase
      .from("players")
      .select("oro,banco")
      .eq("id", userId)
      .single();

    if (!data) return interaction.reply("No tienes personaje.");

    return interaction.reply(
`💰 Oro: ${data.oro}
🏦 Banco: ${data.banco}`
    );
  }

  // ===== DEPOSITAR =====
  if (interaction.commandName === "depositar") {

    const cantidad = interaction.options.getInteger("cantidad");
    if (!cantidad || cantidad <= 0)
      return interaction.reply("Cantidad inválida.");

    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data || data.oro < cantidad)
      return interaction.reply("No tienes suficiente oro.");

    await supabase.from("players")
      .update({
        oro: data.oro - cantidad,
        banco: data.banco + cantidad
      })
      .eq("id", userId);

    return interaction.reply("Depositado correctamente.");
  }

  // ===== RETIRAR =====
  if (interaction.commandName === "retirar") {

    const cantidad = interaction.options.getInteger("cantidad");
    if (!cantidad || cantidad <= 0)
      return interaction.reply("Cantidad inválida.");

    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data || data.banco < cantidad)
      return interaction.reply("No tienes suficiente en banco.");

    await supabase.from("players")
      .update({
        oro: data.oro + cantidad,
        banco: data.banco - cantidad
      })
      .eq("id", userId);

    return interaction.reply("Retirado correctamente.");
  }

  // ===== RANKING =====
  if (interaction.commandName === "ranking") {

    const { data } = await supabase
      .from("players")
      .select("id,nivel")
      .order("nivel", { ascending: false })
      .limit(5);

    let texto = "🏆 TOP 5\n";

    if (data) {
      data.forEach((p, i) => {
        texto += `${i + 1}. ${p.id} - Nivel ${p.nivel}\n`;
      });
    }

    return interaction.reply(texto);
  }

});

// =======================
client.login(process.env.TOKEN);
