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

////////////////////////////////////////////////////
// 🎯 RAREZA → MULTIPLICADOR DE DAÑO
////////////////////////////////////////////////////

const rarezaPower = {
  "Común": 1,
  "Raro": 1.2,
  "Beryraro": 1.5,
  "Épico": 2,
  "Ultra Épico": 3,
  "Legendario": 4,
  "UR": 6
};

////////////////////////////////////////////////////
// ⚔ ARMAS
////////////////////////////////////////////////////

const ARMAS = [
{ id:"A1", nombre:"Espada Novato", raridad:"Común", nivel:1 },
{ id:"A2", nombre:"Hacha Hierro", raridad:"Raro", nivel:5 },
{ id:"A3", nombre:"Katana Carmesí", raridad:"Épico", nivel:20 },
{ id:"A4", nombre:"Lanza Dragón", raridad:"Legendario", nivel:40 },
{ id:"A5", nombre:"Hoja Suprema", raridad:"UR", nivel:80 }
];

////////////////////////////////////////////////////
// 🐾 MASCOTAS
////////////////////////////////////////////////////

const MASCOTAS = [
{ id:"M1", nombre:"Gatito", raridad:"Común", buff:1.1 },
{ id:"M2", nombre:"Lobo Gris", raridad:"Raro", buff:1.2 },
{ id:"M3", nombre:"Fénix", raridad:"Legendario", buff:1.5 },
{ id:"M4", nombre:"Dragón Antiguo", raridad:"UR", buff:2 }
];

////////////////////////////////////////////////////
// 🎣 PECES
////////////////////////////////////////////////////

const PECES = [
{ id:"P1", nombre:"Pez Común", raridad:"Común" },
{ id:"P2", nombre:"Pez Dorado", raridad:"Beryraro" },
{ id:"P3", nombre:"Kraken Juvenil", raridad:"UR" }
];

////////////////////////////////////////////////////
// ⛏ MINERALES
////////////////////////////////////////////////////

const MINERALES = [
{ id:"MIN1", nombre:"Hierro", raridad:"Común" },
{ id:"MIN2", nombre:"Oro", raridad:"Beryraro" },
{ id:"MIN3", nombre:"Núcleo Dracónico", raridad:"UR" }
];

////////////////////////////////////////////////////
// SLASH COMMANDS
////////////////////////////////////////////////////

const commands = [
  new SlashCommandBuilder().setName("elegirmagia")
    .setDescription("Elige magia")
    .addStringOption(o =>
      o.setName("tipo")
       .setDescription("Magia")
       .setRequired(true)
       .addChoices(
         { name: "Dragón Slayer", value: "dragon" },
         { name: "Celestial", value: "celestial" },
         { name: "Oscuro", value: "oscuro" }
       )
    ),
  new SlashCommandBuilder().setName("info").setDescription("Perfil"),
  new SlashCommandBuilder().setName("batalla").setDescription("Pelear"),
  new SlashCommandBuilder().setName("minar").setDescription("Minar"),
  new SlashCommandBuilder().setName("pescar").setDescription("Pescar"),
  new SlashCommandBuilder().setName("aventura").setDescription("Aventura automática"),
  new SlashCommandBuilder().setName("bag").setDescription("Ver mochila"),
  new SlashCommandBuilder().setName("balance").setDescription("Ver oro")
].map(c => c.toJSON());

client.once("ready", async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Fairy Slayers listo");
});

////////////////////////////////////////////////////
// FUNCIONES
////////////////////////////////////////////////////

async function getUser(id){
  const { data } = await supabase.from("personajes").select("*").eq("id", id).single();
  return data;
}

async function updateUser(id,data){
  await supabase.from("personajes").update(data).eq("id", id);
}

function random(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

////////////////////////////////////////////////////
// INTERACCIONES
////////////////////////////////////////////////////

client.on("interactionCreate", async interaction=>{
if(!interaction.isChatInputCommand()) return;

const userId = interaction.user.id;
const cmd = interaction.commandName;
let user = await getUser(userId);

////////////////////////////////////////////////////
// CREAR PERSONAJE
////////////////////////////////////////////////////

if(cmd==="elegirmagia"){
  if(user) return interaction.reply("Ya tienes personaje.");
  const magia = interaction.options.getString("tipo");

  await supabase.from("personajes").insert({
    id:userId,
    magia,
    nivel:1,
    xp:0,
    oro:0,
    vida:500,
    maxvida:500,
    items:[],
    mascotas:[]
  });

  return interaction.reply("✨ Personaje creado.");
}

if(!user) return interaction.reply("No tienes personaje.");

////////////////////////////////////////////////////
// INFO
////////////////////////////////////////////////////

if(cmd==="info"){
  return interaction.reply(
`Nivel: ${user.nivel}
XP: ${user.xp}
Oro: ${user.oro}
Vida: ${user.vida}/${user.maxvida}`
);
}

////////////////////////////////////////////////////
// BATALLA
////////////////////////////////////////////////////

if(cmd==="batalla"){
  let dañoBase = 50 + user.nivel*5;

  let arma = ARMAS.find(a=>a.id===user.arma_equipada);
  if(arma) dañoBase *= rarezaPower[arma.raridad];

  let daño = Math.floor(dañoBase);

  let xpGanada = 100;
  let oroGanado = 80;

  let nuevaXP = user.xp + xpGanada;
  let nuevoNivel = user.nivel;

  if(nuevaXP >= user.nivel*200){
    nuevaXP = 0;
    nuevoNivel++;
  }

  await updateUser(userId,{
    xp:nuevaXP,
    nivel:nuevoNivel,
    oro:user.oro + oroGanado
  });

  return interaction.reply(`⚔️ Victoria!
Daño: ${daño}
+${xpGanada} XP
+${oroGanado} Oro`);
}

////////////////////////////////////////////////////
// MINAR
////////////////////////////////////////////////////

if(cmd==="minar"){
  const mineral = random(MINERALES);
  const items = user.items || [];
  items.push(mineral);

  await updateUser(userId,{items});

  return interaction.reply(`⛏ Minaste: ${mineral.nombre} (${mineral.raridad})`);
}

////////////////////////////////////////////////////
// PESCAR
////////////////////////////////////////////////////

if(cmd==="pescar"){
  const pez = random(PECES);
  const items = user.items || [];
  items.push(pez);

  await updateUser(userId,{items});

  return interaction.reply(`🎣 Pescaste: ${pez.nombre} (${pez.raridad})`);
}

////////////////////////////////////////////////////
// AVENTURA
////////////////////////////////////////////////////

if(cmd==="aventura"){
  const arma = random(ARMAS);
  const items = user.items || [];
  items.push(arma);

  await updateUser(userId,{
    xp:user.xp + 150,
    oro:user.oro + 120,
    items
  });

  return interaction.reply(`🏰 Aventura completada!
Loot: ${arma.nombre} (${arma.raridad})
+150 XP
+120 Oro`);
}

////////////////////////////////////////////////////
// BAG
////////////////////////////////////////////////////

if(cmd==="bag"){
  if(!user.items.length) return interaction.reply("Mochila vacía.");

  const lista = user.items.map(i=>`${i.nombre} (${i.raridad})`).join("\n");
  return interaction.reply(`🎒 Mochila:\n${lista}`);
}

////////////////////////////////////////////////////
// BALANCE
////////////////////////////////////////////////////

if(cmd==="balance"){
  return interaction.reply(`💰 Oro: ${user.oro}`);
}

});

client.login(process.env.TOKEN);
