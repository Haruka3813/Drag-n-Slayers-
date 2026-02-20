require('dotenv').config();
const express = require("express");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

if (!process.env.TOKEN) { console.log("❌ TOKEN no encontrado"); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
app.get("/", (req, res) => res.send("Fairy Slayers Pro Ultimate activo"));
app.listen(10000, () => console.log("Servidor web activo en puerto 10000"));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const CLIENT_ID = process.env.CLIENT_ID;

// -----------------
// Raridades
// -----------------
const raridades = ["Común", "Raro", "Beryraro", "Épico", "Ultra Épico", "Legendario", "UR"];

// -----------------
// Loot y objetos
// -----------------
const armas = [
  { nombre: "Espada de fuego", tipo: "arma", nivel: 1, raridad: "Común" },
  { nombre: "Lanza celestial", tipo: "arma", nivel: 10, raridad: "Raro" },
  { nombre: "Martillo UR", tipo: "arma", nivel: 100, raridad: "UR" }
];

const armaduras = [
  { nombre: "Armadura ligera", tipo: "armadura", nivel: 1, raridad: "Común" },
  { nombre: "Armadura mística", tipo: "armadura", nivel: 20, raridad: "Épico" },
  { nombre: "Armadura de dragón UR", tipo: "armadura", nivel: 100, raridad: "UR" }
];

const mascotas = [
  { nombre: "Gatito", tipo: "Común" },
  { nombre: "Dragón bebé", tipo: "Legendario" },
  { nombre: "Fénix", tipo: "UR" }
];

const items = [
  { nombre: "Poción de vida", tipo: "consumible" },
  { nombre: "Caña de pescar UR", tipo: "herramienta" },
  { nombre: "Pico de minería UR", tipo: "herramienta" }
];

const enemigos = [
  { nombre: "Slime Verde", nivel: 1, oro: 50, xp: 50, loot: ["Espada de fuego"] },
  { nombre: "Goblin Guerrero", nivel: 5, oro: 150, xp: 150, loot: ["Armadura ligera"] },
  { nombre: "Dragón de Hielo", nivel: 50, oro: 500, xp: 500, loot: ["Martillo UR", "Fénix"] }
];

const misiones = [
  { nombre: "Salvar el pueblo", xp: 100, oro: 100, loot: ["Espada de fuego"] },
  { nombre: "Recolectar cristales", xp: 200, oro: 200, loot: ["Armadura mística"] },
  { nombre: "Derrotar al Dragón", xp: 1000, oro: 1000, loot: ["Martillo UR", "Fénix"] }
];

// -----------------
// Comandos slash
// -----------------
const commands = [
  new SlashCommandBuilder().setName("elegirmagia").setDescription("Elige tu magia")
    .addStringOption(opt => opt.setName("tipo").setDescription("Tipo de magia").setRequired(true)
      .addChoices(
        { name: "Dragón Slayer", value: "dragon" },
        { name: "Mago Celestial", value: "celestial" },
        { name: "Mago Oscuro", value: "oscuro" }
      )),
  new SlashCommandBuilder().setName("info").setDescription("Ver tu perfil"),
  new SlashCommandBuilder().setName("batalla").setDescription("Buscar enemigo PvE"),
  new SlashCommandBuilder().setName("aventura").setDescription("Misiones automáticas"),
  new SlashCommandBuilder().setName("tienda").setDescription("Ver y comprar items"),
  new SlashCommandBuilder().setName("use").setDescription("Usar item de la mochila")
    .addStringOption(opt => opt.setName("item").setDescription("Nombre del item").setRequired(true)),
  new SlashCommandBuilder().setName("bag").setDescription("Ver items en tu mochila"),
  new SlashCommandBuilder().setName("balance").setDescription("Ver oro y dinero en banco"),
  new SlashCommandBuilder().setName("mascotas").setDescription("Ver y equipar mascotas"),
  new SlashCommandBuilder().setName("equipar").setDescription("Equipar arma, armadura o mascota")
    .addStringOption(opt => opt.setName("tipo").setDescription("arma, armadura o mascota").setRequired(true))
    .addStringOption(opt => opt.setName("nombre").setDescription("nombre del item/mascota").setRequired(true)),
  new SlashCommandBuilder().setName("minar").setDescription("Minar recursos"),
  new SlashCommandBuilder().setName("pescar").setDescription("Pescar recursos"),
  new SlashCommandBuilder().setName("ayuda").setDescription("Ver comandos")
].map(cmd => cmd.toJSON());

// -----------------
// Registrar comandos
// -----------------
client.once("ready", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Comandos slash registrados");
});

// -----------------
// Funciones auxiliares
// -----------------
async function getPersonaje(userId) {
  const { data } = await supabase.from("personajes").select("*").eq("id", userId).single();
  return data;
}

async function actualizarPersonaje(userId, update) {
  await supabase.from("personajes").update(update).eq("id", userId);
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

function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getRandomElement(array) { return array[getRandomInt(0, array.length-1)]; }

// -----------------
// Interacciones
// -----------------
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;
  const cmd = interaction.commandName;
  let personaje = await getPersonaje(userId);

  // -----------------
  // Elegir magia
  // -----------------
  if (cmd === "elegirmagia") {
    if (personaje) return interaction.reply("Ya tienes personaje.");
    const magia = interaction.options.getString("tipo");
    await supabase.from("personajes").insert({
      id: userId, magia, nivel: 1, xp: 0, oro: 0, oro_banco: 0,
      vida: 500, maxvida: 500, lastbatalla: Date.now(), regeneracion: Date.now(),
      mascotas: [], arma_equipada: null, armadura_equipada: null, items: [], gremio: null
    });
    return interaction.reply(`✨ Personaje creado con magia ${magia}. Vida 500.`);
  }

  if (!personaje) return interaction.reply("No tienes personaje creado.");

  // -----------------
  // Info
  // -----------------
  if (cmd === "info") {
    const mascotasStr = personaje.mascotas?.map(m => `${m.nombre} (${m.tipo})`).join(", ") || "Ninguna";
    const arma = personaje.arma_equipada || "Ninguna";
    const armadura = personaje.armadura_equipada || "Ninguna";
    return interaction.reply(
`📜 **Perfil**
Magia: ${personaje.magia}
Nivel: ${personaje.nivel}
XP: ${personaje.xp}
Oro: ${personaje.oro} (Banco: ${personaje.oro_banco})
Vida: ${personaje.vida}/${personaje.maxvida}
Arma equipada: ${arma}
Armadura equipada: ${armadura}
Mascotas: ${mascotasStr}`
    );
  }

  // -----------------
  // Bag
  // -----------------
  if (cmd === "bag") {
    const mochila = personaje.items || [];
    if (!mochila.length) return interaction.reply("👜 Tu mochila está vacía.");
    const lista = mochila.map(i => `${i.nombre} x${i.cantidad}`).join("\n");
    return interaction.reply(`👜 Mochila:\n${lista}`);
  }

  // -----------------
  // Balance
  // -----------------
  if (cmd === "balance") {
    return interaction.reply(`💰 Oro: ${personaje.oro}\n🏦 Banco: ${personaje.oro_banco}`);
  }

  // -----------------
  // Tienda
  // -----------------
  if (cmd === "tienda") {
    const lista = [...armas, ...armaduras, ...mascotas, ...items].map(i => `${i.nombre} (${i.tipo}, ${i.raridad || "Normal"})`).join("\n");
    return interaction.reply(`🏪 Tienda disponible:\n${lista}`);
  }

  // -----------------
  // Equipar
  // -----------------
  if (cmd === "equipar") {
    const tipo = interaction.options.getString("tipo");
    const nombre = interaction.options.getString("nombre");
    if (tipo === "arma") await actualizarPersonaje(userId, { arma_equipada: nombre });
    else if (tipo === "armadura") await actualizarPersonaje(userId, { armadura_equipada: nombre });
    else if (tipo === "mascota") {
      const masc = personaje.mascotas || [];
      if (!masc.find(m => m.nombre === nombre)) return interaction.reply("No tienes esa mascota.");
      await actualizarPersonaje(userId, { mascotas: masc });
    }
    return interaction.reply(`✅ ${tipo} ${nombre} equipada.`);
  }

  // -----------------
  // Usar item
  // -----------------
  if (cmd === "use") {
    const item = interaction.options.getString("item");
    await interaction.reply(`Usaste ${item}.`);
  }

  // -----------------
  // Minar
  // -----------------
  if (cmd === "minar") {
    const lugares = ["Mina del Norte", "Cueva Oscura", "Montaña de Fuego", "Abismo Misterioso"];
    const lugar = getRandomElement(lugares);
    const oro = getRandomInt(50, 150);
    await actualizarPersonaje(userId, { oro: personaje.oro + oro });
    return interaction.reply(`⛏️ Has minado en ${lugar} y conseguido ${oro} de oro. Pico intacto.`);
  }

  // -----------------
  // Pescar
  // -----------------
  if (cmd === "pescar") {
    const lugares = ["Lago Cristalino", "Río Plateado", "Mar de Tempestad"];
    const lugar = getRandomElement(lugares);
    const oro = getRandomInt(50, 150);
    await actualizarPersonaje(userId, { oro: personaje.oro + oro });
    return interaction.reply(`🎣 Has pescado en ${lugar} y conseguido ${oro} de oro. Caña intacta.`);
  }

  // -----------------
  // Aventura
  // -----------------
  if (cmd === "aventura") {
    const mision = getRandomElement(misiones);
    const loot = mision.loot || [];
    for (let i of loot) await agregarItem(userId, i);
    await actualizarPersonaje(userId, { xp: personaje.xp + mision.xp, oro: personaje.oro + mision.oro });
    return interaction.reply(`🏰 Has completado la misión "${mision.nombre}"!
+${mision.xp} XP
+${mision.oro} Oro
Loot: ${loot.join(", ")}`);
  }

  // -----------------
  // Ayuda
  // -----------------
  if (cmd === "ayuda") {
    return interaction.reply(
`📘 Fairy Slayers Pro Ultimate

/elegirmagia
/info
/batalla
/aventura
/tienda
/use
/bag
/balance
/mascotas
/equipar
/minar
/pescar`
    );
  }

});

client.login(process.env.TOKEN);
