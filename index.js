require('dotenv').config();
const express = require("express");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const app = express();
app.get("/", (req, res) => res.send("RPG activo"));
app.listen(10000, () => console.log("Web online"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const CLIENT_ID = process.env.CLIENT_ID;

const commands = [

new SlashCommandBuilder()
.setName("elegirmagia")
.setDescription("Crear personaje")
.addStringOption(o =>
  o.setName("tipo")
  .setDescription("Tipo")
  .setRequired(true)
  .addChoices(
    { name: "Fuego", value: "fuego" },
    { name: "Luz", value: "luz" },
    { name: "Oscuridad", value: "oscuridad" }
  )
),

new SlashCommandBuilder().setName("info").setDescription("Ver perfil"),
new SlashCommandBuilder().setName("batalla").setDescription("Pelear contra enemigo"),
new SlashCommandBuilder().setName("bag").setDescription("Ver inventario"),
new SlashCommandBuilder().setName("balance").setDescription("Ver dinero"),
new SlashCommandBuilder().setName("minar").setDescription("Ir a minar"),
new SlashCommandBuilder().setName("pescar").setDescription("Ir a pescar"),
new SlashCommandBuilder().setName("tienda").setDescription("Ver tienda"),
new SlashCommandBuilder()
.setName("equipar")
.setDescription("Equipar item")
.addStringOption(o =>
  o.setName("id")
  .setDescription("ID del item")
  .setRequired(true)
),

new SlashCommandBuilder()
.setName("usar")
.setDescription("Usar item")
.addStringOption(o =>
  o.setName("id")
  .setDescription("ID del item")
  .setRequired(true)
),

new SlashCommandBuilder().setName("misiones").setDescription("Ver misiones"),
new SlashCommandBuilder().setName("mascota").setDescription("Ver mascotas")

].map(c => c.toJSON());

client.once("clientReady", async () => {
  console.log(`Bot listo ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("Comandos registrados");
});// =========================
// FUNCIONES AUXILIARES
// =========================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPersonaje(userId) {
  const { data } = await supabase
    .from("personajes")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

// =========================
// INTERACCIONES
// =========================

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply(); // evita "application did not respond"

  const userId = interaction.user.id;

  // =========================
  // CREAR PERSONAJE
  // =========================
  if (interaction.commandName === "elegirmagia") {

    const magia = interaction.options.getString("tipo");
    const existe = await getPersonaje(userId);

    if (existe) {
      return interaction.editReply("⚠ Ya tienes personaje.");
    }

    const { error } = await supabase.from("personajes").insert({
      id: userId,
      magia,
      nivel: 1,
      xp: 0,
      oro: 500,
      vida: 500,
      maxvida: 500
    });

    if (error) {
      console.log(error);
      return interaction.editReply("Error creando personaje.");
    }

    return interaction.editReply(`✨ Personaje creado con magia ${magia}`);
  }

  // =========================
  // PERFIL
  // =========================
  if (interaction.commandName === "info") {

    const pj = await getPersonaje(userId);
    if (!pj) return interaction.editReply("No tienes personaje.");

    return interaction.editReply(
`📜 Perfil
Magia: ${pj.magia}
Nivel: ${pj.nivel}
XP: ${pj.xp}
Oro: ${pj.oro}
Vida: ${pj.vida}/${pj.maxvida}`
    );
  }

  // =========================
  // BALANCE
  // =========================
  if (interaction.commandName === "balance") {

    const pj = await getPersonaje(userId);
    if (!pj) return interaction.editReply("No tienes personaje.");

    const { data } = await supabase
      .from("banco")
      .select("*")
      .eq("user_id", userId)
      .single();

    const bancoDinero = data ? data.dinero : 0;

    return interaction.editReply(
`💰 Dinero en mano: ${pj.oro}
🏦 Banco: ${bancoDinero}`
    );
  }

  // =========================
  // BAG
  // =========================
  if (interaction.commandName === "bag") {

    const { data } = await supabase
      .from("inventario")
      .select("*")
      .eq("user_id", userId);

    if (!data || data.length === 0)
      return interaction.editReply("🎒 Inventario vacío.");

    let texto = "🎒 Inventario:\n";
    data.forEach(i => {
      texto += `ID: ${i.item_id} x${i.cantidad}\n`;
    });

    return interaction.editReply(texto);
  }

  // =========================
  // EQUIPAR
  // =========================
  if (interaction.commandName === "equipar") {

    const itemId = interaction.options.getString("id");

    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (!data) return interaction.editReply("Item no existe.");

    await sleep(1000); // estilo lento

    return interaction.editReply(`⚔ Has equipado ${data.nombre}`);
  }

  // =========================
  // MASCOTA
  // =========================
  if (interaction.commandName === "mascota") {

    const { data } = await supabase
      .from("inventario")
      .select("*")
      .eq("user_id", userId);

    if (!data) return interaction.editReply("No tienes mascotas.");

    return interaction.editReply("🐾 Usa /equipar ID para equipar mascota.");
  }

});// =========================
  // BATALLA
  // =========================
  if (interaction.commandName === "batalla") {

    const pj = await getPersonaje(userId);
    if (!pj) return interaction.editReply("No tienes personaje.");

    const { data: enemigos } = await supabase
      .from("enemigos")
      .select("*");

    if (!enemigos || enemigos.length === 0)
      return interaction.editReply("No hay enemigos.");

    const enemigo = enemigos[Math.floor(Math.random() * enemigos.length)];

    await sleep(1500);

    let dañoJugador = Math.floor(Math.random() * 100) + 50;
    let dañoEnemigo = enemigo.ataque;

    let nuevaVida = pj.vida - dañoEnemigo;
    if (nuevaVida < 0) nuevaVida = 0;

    let oroGanado = enemigo.recompensa_oro;
    let xpGanado = enemigo.recompensa_xp;

    await supabase.from("personajes").update({
      vida: nuevaVida,
      oro: pj.oro + oroGanado,
      xp: pj.xp + xpGanado
    }).eq("id", userId);

    return interaction.editReply(
`⚔ Peleaste contra ${enemigo.nombre}

Recibiste ${dañoEnemigo} de daño
Ganaste ${xpGanado} XP
Ganaste ${oroGanado} oro

Vida restante: ${nuevaVida}`
    );
  }

  // =========================
  // MINAR
  // =========================
  if (interaction.commandName === "minar") {

    const pj = await getPersonaje(userId);
    if (!pj) return interaction.editReply("No tienes personaje.");

    const { data: minerales } = await supabase
      .from("items")
      .select("*")
      .eq("tipo", "mineral");

    if (!minerales || minerales.length === 0)
      return interaction.editReply("No hay minerales.");

    const drop = minerales[Math.floor(Math.random() * minerales.length)];

    await supabase.from("inventario").insert({
      user_id: userId,
      item_id: drop.id,
      cantidad: 1
    });

    await sleep(1200);

    return interaction.editReply(`⛏ Minaste y encontraste ${drop.nombre}`);
  }

  // =========================
  // PESCAR
  // =========================
  if (interaction.commandName === "pescar") {

    const pj = await getPersonaje(userId);
    if (!pj) return interaction.editReply("No tienes personaje.");

    const { data: peces } = await supabase
      .from("items")
      .select("*")
      .eq("tipo", "fish");

    if (!peces || peces.length === 0)
      return interaction.editReply("No hay peces.");

    const drop = peces[Math.floor(Math.random() * peces.length)];

    await supabase.from("inventario").insert({
      user_id: userId,
      item_id: drop.id,
      cantidad: 1
    });

    await sleep(1500);

    return interaction.editReply(`🎣 Pescaste ${drop.nombre}`);
  }

  // =========================
  // MISIONES
  // =========================
  if (interaction.commandName === "misiones") {

    const { data } = await supabase
      .from("misiones")
      .select("*");

    if (!data) return interaction.editReply("No hay misiones.");

    let texto = "📜 Misiones disponibles:\n\n";

    data.forEach(m => {
      texto += `${m.nombre}
Recompensa: ${m.recompensa_oro} oro / ${m.recompensa_xp} XP\n\n`;
    });

    return interaction.editReply(texto);
  });
client.login(process.env.TOKEN);
