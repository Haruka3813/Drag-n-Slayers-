require('dotenv').config();
const express = require("express");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

if (!process.env.TOKEN) {
  console.log("❌ TOKEN no encontrado");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
app.get("/", (req, res) => res.send("Fairy Slayers Online"));
app.listen(10000);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const CLIENT_ID = process.env.CLIENT_ID;

//////////////////////////////////////////////////
// 🎒 BASE DE DATOS DE OBJETOS CON ID
//////////////////////////////////////////////////

const ARMAS = [
  { id: "A1", nombre: "Espada de Fuego", raridad: "Común", nivel: 1 },
  { id: "A2", nombre: "Lanza Celestial", raridad: "Raro", nivel: 10 },
  { id: "A3", nombre: "Martillo UR", raridad: "UR", nivel: 100 }
];

const ARMADURAS = [
  { id: "AR1", nombre: "Armadura Ligera", raridad: "Común", nivel: 1 },
  { id: "AR2", nombre: "Armadura Mística", raridad: "Épico", nivel: 20 },
  { id: "AR3", nombre: "Armadura Dragón UR", raridad: "UR", nivel: 100 }
];

const MASCOTAS = [
  { id: "M1", nombre: "Gatito", raridad: "Común" },
  { id: "M2", nombre: "Dragón Bebé", raridad: "Legendario" },
  { id: "M3", nombre: "Fénix UR", raridad: "UR" }
];

const ITEMS = [
  { id: "I1", nombre: "Poción Vida", tipo: "consumible" },
  { id: "I2", nombre: "Mineral Hierro", tipo: "material" },
  { id: "I3", nombre: "Pez Dorado", tipo: "material" }
];

//////////////////////////////////////////////////
// SLASH COMMANDS
//////////////////////////////////////////////////

const commands = [
  new SlashCommandBuilder().setName("elegirmagia")
    .setDescription("Elige tu magia")
    .addStringOption(opt =>
      opt.setName("tipo")
        .setDescription("Tipo de magia")
        .setRequired(true)
        .addChoices(
          { name: "Dragón Slayer", value: "dragon" },
          { name: "Celestial", value: "celestial" },
          { name: "Oscuro", value: "oscuro" }
        )
    ),

  new SlashCommandBuilder().setName("info").setDescription("Ver perfil"),
  new SlashCommandBuilder().setName("bag").setDescription("Ver mochila"),
  new SlashCommandBuilder().setName("balance").setDescription("Ver oro"),
  new SlashCommandBuilder().setName("tienda").setDescription("Ver tienda"),
  new SlashCommandBuilder().setName("mascotas").setDescription("Ver mascotas"),
  new SlashCommandBuilder().setName("minar").setDescription("Minar"),
  new SlashCommandBuilder().setName("pescar").setDescription("Pescar"),
  new SlashCommandBuilder().setName("aventura").setDescription("Modo aventura")
].map(c => c.toJSON());

//////////////////////////////////////////////////

client.once("ready", async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Bot listo");
});

//////////////////////////////////////////////////
// FUNCIONES
//////////////////////////////////////////////////

async function getUser(id) {
  const { data } = await supabase.from("personajes").select("*").eq("id", id).single();
  return data;
}

async function updateUser(id, data) {
  await supabase.from("personajes").update(data).eq("id", id);
}

function random(array) {
  return array[Math.floor(Math.random() * array.length)];
}

//////////////////////////////////////////////////
// INTERACCIONES
//////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const cmd = interaction.commandName;
  let user = await getUser(userId);

  //////////////////////////////////////////////
  // CREAR PERSONAJE
  //////////////////////////////////////////////

  if (cmd === "elegirmagia") {
    if (user) return interaction.reply("Ya tienes personaje.");

    const magia = interaction.options.getString("tipo");

    await supabase.from("personajes").insert({
      id: userId,
      magia,
      nivel: 1,
      xp: 0,
      oro: 0,
      oro_banco: 0,
      vida: 500,
      maxvida: 500,
      items: [],
      mascotas: [],
      arma_equipada: null,
      armadura_equipada: null
    });

    return interaction.reply("✨ Personaje creado.");
  }

  if (!user) return interaction.reply("No tienes personaje.");

  //////////////////////////////////////////////
  // INFO
  //////////////////////////////////////////////

  if (cmd === "info") {
    return interaction.reply(
`📜 Perfil
Magia: ${user.magia}
Nivel: ${user.nivel}
XP: ${user.xp}
Oro: ${user.oro}`
    );
  }

  //////////////////////////////////////////////
  // BAG
  //////////////////////////////////////////////

  if (cmd === "bag") {
    if (!user.items.length) return interaction.reply("Mochila vacía.");

    const lista = user.items.map(i => `${i.nombre} (ID:${i.id}) x${i.cantidad}`).join("\n");
    return interaction.reply(`🎒 Mochila:\n${lista}`);
  }

  //////////////////////////////////////////////
  // BALANCE
  //////////////////////////////////////////////

  if (cmd === "balance") {
    return interaction.reply(`💰 Oro: ${user.oro}`);
  }

  //////////////////////////////////////////////
  // TIENDA
  //////////////////////////////////////////////

  if (cmd === "tienda") {
    const lista = [...ARMAS, ...ARMADURAS, ...MASCOTAS, ...ITEMS]
      .map(i => `${i.nombre} | ID:${i.id} | ${i.raridad || i.tipo}`)
      .join("\n");

    return interaction.reply(`🏪 Tienda:\n${lista}`);
  }

  //////////////////////////////////////////////
  // MASCOTAS
  //////////////////////////////////////////////

  if (cmd === "mascotas") {
    if (!user.mascotas.length) return interaction.reply("No tienes mascotas.");

    const lista = user.mascotas.map(m => `${m.nombre} (ID:${m.id})`).join("\n");
    return interaction.reply(`🐾 Mascotas:\n${lista}`);
  }

  //////////////////////////////////////////////
  // MINAR
  //////////////////////////////////////////////

  if (cmd === "minar") {
    const mineral = random(ITEMS);
    const mochila = user.items || [];
    mochila.push({ id: mineral.id, nombre: mineral.nombre, cantidad: 1 });

    await updateUser(userId, {
      oro: user.oro + 50,
      items: mochila
    });

    return interaction.reply(`⛏️ Minaste y obtuviste ${mineral.nombre} (ID:${mineral.id})`);
  }

  //////////////////////////////////////////////
  // PESCAR
  //////////////////////////////////////////////

  if (cmd === "pescar") {
    const pez = random(ITEMS);
    const mochila = user.items || [];
    mochila.push({ id: pez.id, nombre: pez.nombre, cantidad: 1 });

    await updateUser(userId, {
      oro: user.oro + 50,
      items: mochila
    });

    return interaction.reply(`🎣 Pescaste ${pez.nombre} (ID:${pez.id})`);
  }

  //////////////////////////////////////////////
  // AVENTURA
  //////////////////////////////////////////////

  if (cmd === "aventura") {
    const armaDrop = random(ARMAS);
    const mochila = user.items || [];
    mochila.push({ id: armaDrop.id, nombre: armaDrop.nombre, cantidad: 1 });

    await updateUser(userId, {
      xp: user.xp + 100,
      oro: user.oro + 100,
      items: mochila
    });

    return interaction.reply(`🏰 Aventura completada.
+100 XP
+100 Oro
Loot: ${armaDrop.nombre} (ID:${armaDrop.id})`);
  }

});

client.login(process.env.TOKEN);
