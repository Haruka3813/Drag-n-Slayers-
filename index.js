require('dotenv').config();
const express = require("express");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

if (!process.env.TOKEN) {
  console.log("❌ TOKEN no encontrado en Environment Variables");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const app = express();
app.get("/", (req, res) => res.send("Fairy Slayers Pro Ultimate activo"));
app.listen(10000, () => console.log("Servidor web activo en puerto 10000"));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const CLIENT_ID = process.env.CLIENT_ID;

// ==========================
// Comandos slash
// ==========================
const commands = [
  new SlashCommandBuilder().setName("elegirmagia").setDescription("Elige tu magia")
    .addStringOption(opt => opt.setName("tipo").setDescription("Tipo de magia").setRequired(true)
      .addChoices(
        { name: "Dragón Slayer", value: "dragon" },
        { name: "Mago Celestial", value: "celestial" },
        { name: "Mago Oscuro", value: "oscuro" }
      )),
  new SlashCommandBuilder().setName("info").setDescription("Ver tu perfil completo"),
  new SlashCommandBuilder().setName("batalla").setDescription("Buscar enemigo PvP o PvE"),
  new SlashCommandBuilder().setName("betatester").setDescription("Recompensa beta"),
  new SlashCommandBuilder().setName("miau").setDescription("Recibir mascota inicial"),
  new SlashCommandBuilder().setName("tienda").setDescription("Ver y comprar items"),
  new SlashCommandBuilder().setName("equipar").setDescription("Equipar arma o mascota")
    .addStringOption(opt => opt.setName("tipo").setDescription("arma o mascota").setRequired(true))
    .addStringOption(opt => opt.setName("nombre").setDescription("nombre del item/mascota").setRequired(true)),
  new SlashCommandBuilder().setName("gremio").setDescription("Ver, crear o unirse a gremio")
    .addStringOption(opt => opt.setName("accion").setDescription("crear/unirse/ver").setRequired(true))
    .addStringOption(opt => opt.setName("nombre").setDescription("nombre del gremio")),
  new SlashCommandBuilder().setName("sorteo").setDescription("Sorteos automáticos"),
  new SlashCommandBuilder().setName("aventura").setDescription("Modo aventura automática"),
  new SlashCommandBuilder().setName("use").setDescription("Usar item de la mochila")
    .addStringOption(opt => opt.setName("item").setDescription("Nombre del item").setRequired(true)),
  new SlashCommandBuilder().setName("bag").setDescription("Ver items en tu mochila"),
  new SlashCommandBuilder().setName("balance").setDescription("Ver oro y dinero en banco"),
  new SlashCommandBuilder().setName("mascotas").setDescription("Ver y equipar mascotas"),
  new SlashCommandBuilder().setName("minar").setDescription("Minar recursos"),
  new SlashCommandBuilder().setName("pescar").setDescription("Pescar recursos"),
  new SlashCommandBuilder().setName("ayuda").setDescription("Ver comandos")
].map(cmd => cmd.toJSON());

// ==========================
// Registrar comandos
// ==========================
client.once("ready", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Comandos slash registrados");
});

// ==========================
// Funciones auxiliares
// ==========================
async function getPersonaje(userId) {
  const { data } = await supabase.from("personajes").select("*").eq("id", userId).single();
  return data;
}

async function actualizarPersonaje(userId, update) {
  await supabase.from("personajes").update(update).eq("id", userId);
}

async function getItem(nombre) {
  const { data } = await supabase.from("items").select("*").eq("nombre", nombre).single();
  return data;
}

async function agregarItem(userId, itemNombre, cantidad = 1) {
  const personaje = await getPersonaje(userId);
  if (!personaje) return;
  const mochila = personaje.items || [];
  const idx = mochila.findIndex(i => i.nombre === itemNombre);
  if (idx >= 0) mochila[idx].cantidad += cantidad;
  else mochila.push({ nombre: itemNombre, cantidad });
  await actualizarPersonaje(userId, { items: mochila });
}

// ==========================
// Interacciones
// ==========================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;

  // --------------------
  // Elegir magia
  // --------------------
  if (interaction.commandName === "elegirmagia") {
    const magia = interaction.options.getString("tipo");
    const data = await getPersonaje(userId);
    if (data) return interaction.reply("Ya tienes personaje creado.");

    const { error: insertError } = await supabase.from("personajes").insert({
      id: userId, magia, nivel: 1, xp: 0, oro: 0, oro_banco: 0,
      vida: 500, maxvida: 500, lastbatalla: Date.now(), regeneracion: Date.now(),
      mascotas: [], arma_equipada: null, items: []
    });
    if (insertError) {
      console.log("❌ Error insert personaje:", insertError);
      return interaction.reply("Ocurrió un error creando tu personaje.");
    }
    return interaction.reply(`✨ Personaje creado con magia ${magia}. Vida 500.`);
  }

  // --------------------
  // Info
  // --------------------
  if (interaction.commandName === "info") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");

    const mascotas = data.mascotas?.map(m => `${m.nombre} (${m.tipo})`).join(", ") || "Ninguna";
    const arma = data.arma_equipada || "Ninguna";

    return interaction.reply(
`📜 **Perfil**
Magia: ${data.magia}
Nivel: ${data.nivel}
XP: ${data.xp}
Oro: ${data.oro} (Banco: ${data.oro_banco})
Vida: ${data.vida}/${data.maxvida}
Arma equipada: ${arma}
Mascotas: ${mascotas}`
    );
  }

  // --------------------
  // Minar
  // --------------------
  if (interaction.commandName === "minar") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");
    const oroMinado = Math.floor(Math.random() * 50) + 50;
    await actualizarPersonaje(userId, { oro: data.oro + oroMinado });
    return interaction.reply(`⛏️ Has minado y conseguido ${oroMinado} de oro. Pico intacto.`);
  }

  // --------------------
  // Pescar
  // --------------------
  if (interaction.commandName === "pescar") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");
    const oroPesca = Math.floor(Math.random() * 50) + 50;
    await actualizarPersonaje(userId, { oro: data.oro + oroPesca });
    return interaction.reply(`🎣 Has pescado y conseguido ${oroPesca} de oro. Caña intacta.`);
  }

  // --------------------
  // /use
  // --------------------
  if (interaction.commandName === "use") {
    const itemNombre = interaction.options.getString("item");
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");
    const mochila = data.items || [];
    const item = mochila.find(i => i.nombre === itemNombre);
    if (!item || item.cantidad <= 0) return interaction.reply("No tienes ese item.");
    const itemInfo = await getItem(itemNombre);
    if (!itemInfo) return interaction.reply("Item inválido.");
    // Aplica efecto
    const efectos = itemInfo.efecto || {};
    const nuevoOro = (data.oro || 0) + (efectos.oro || 0);
    const nuevaVida = Math.min((data.vida || 0) + (efectos.vida || 0), data.maxvida);
    const nuevoXP = (data.xp || 0) + (efectos.xp || 0);
    // Actualiza mochila
    item.cantidad -= 1;
    await actualizarPersonaje(userId, { oro: nuevoOro, vida: nuevaVida, xp: nuevoXP, items: mochila });
    return interaction.reply(`✅ Usaste ${itemNombre}. Vida: ${nuevaVida}, XP: ${nuevoXP}, Oro: ${nuevoOro}`);
  }

  // --------------------
  // /bag
  // --------------------
  if (interaction.commandName === "bag") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");
    const mochila = data.items || [];
    if (!mochila.length) return interaction.reply("Tu mochila está vacía.");
    const lista = mochila.map(i => `${i.nombre} x${i.cantidad}`).join("\n");
    return interaction.reply(`🎒 Mochila:\n${lista}`);
  }

  // --------------------
  // /balance
  // --------------------
  if (interaction.commandName === "balance") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");
    return interaction.reply(`💰 Oro: ${data.oro}\n🏦 Banco: ${data.oro_banco}`);
  }

  // --------------------
  // /mascotas
  // --------------------
  if (interaction.commandName === "mascotas") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");
    const mascotas = data.mascotas || [];
    if (!mascotas.length) return interaction.reply("No tienes mascotas.");
    const lista = mascotas.map(m => `${m.nombre} (${m.tipo})`).join("\n");
    return interaction.reply(`🐾 Mascotas:\n${lista}`);
  }

  // --------------------
  // Aquí seguirían los demás comandos: batalla, tienda, equipar, gremio, aventura, betatester, miau, sorteo, ayuda
  // Tal como en la versión Pro Ultimate
  // --------------------
});

client.login(process.env.TOKEN);
