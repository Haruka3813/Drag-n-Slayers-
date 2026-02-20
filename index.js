require('dotenv').config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

//////////////////////////////////////////////////
// 🔐 VALIDACIÓN TOKEN
//////////////////////////////////////////////////

if (!process.env.TOKEN) {
  console.log("❌ TOKEN no encontrado");
  process.exit(1);
}

//////////////////////////////////////////////////
// 🌍 SERVIDOR WEB (Render)
//////////////////////////////////////////////////

const app = express();
app.get("/", (req, res) => res.send("Fairy Slayers MMO Online"));
app.listen(10000);

//////////////////////////////////////////////////
// 🤖 DISCORD CLIENT
//////////////////////////////////////////////////

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

//////////////////////////////////////////////////
// 🗄 SUPABASE
//////////////////////////////////////////////////

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const CLIENT_ID = process.env.CLIENT_ID;

//////////////////////////////////////////////////
// ⚔ RAREZAS
//////////////////////////////////////////////////

const RAREZA_MULT = {
  "Común": 1,
  "Raro": 1.2,
  "Beryraro": 1.5,
  "Épico": 2,
  "Ultra Épico": 3,
  "Legendario": 4,
  "UR": 6
};

const RAREZA_DEF = {
  "Común": 0,
  "Raro": 5,
  "Beryraro": 10,
  "Épico": 20,
  "Ultra Épico": 30,
  "Legendario": 40,
  "UR": 60
};

//////////////////////////////////////////////////
// ⚔ 20 ARMAS
//////////////////////////////////////////////////

const ARMAS = [
{ id:"A1", nombre:"Espada Novato", raridad:"Común", base:10 },
{ id:"A2", nombre:"Daga Sombría", raridad:"Común", base:12 },
{ id:"A3", nombre:"Hacha Hierro", raridad:"Raro", base:18 },
{ id:"A4", nombre:"Báculo Arcano", raridad:"Raro", base:20 },
{ id:"A5", nombre:"Katana Carmesí", raridad:"Beryraro", base:30 },
{ id:"A6", nombre:"Lanza Celeste", raridad:"Beryraro", base:32 },
{ id:"A7", nombre:"Espada Cristal", raridad:"Épico", base:45 },
{ id:"A8", nombre:"Martillo Trueno", raridad:"Épico", base:50 },
{ id:"A9", nombre:"Arco Lunar", raridad:"Ultra Épico", base:70 },
{ id:"A10", nombre:"Guadaña Fantasma", raridad:"Ultra Épico", base:75 },
{ id:"A11", nombre:"Espada Solar", raridad:"Legendario", base:95 },
{ id:"A12", nombre:"Tridente Abisal", raridad:"Legendario", base:100 },
{ id:"A13", nombre:"Lanza Dragón", raridad:"UR", base:150 },
{ id:"A14", nombre:"Hoja Suprema", raridad:"UR", base:170 },
{ id:"A15", nombre:"Espada Vacío", raridad:"UR", base:200 },
{ id:"A16", nombre:"Cuchillas Gemelas", raridad:"Épico", base:48 },
{ id:"A17", nombre:"Maza Colosal", raridad:"Beryraro", base:28 },
{ id:"A18", nombre:"Espada Rúnica", raridad:"Ultra Épico", base:72 },
{ id:"A19", nombre:"Arco Dragón", raridad:"Legendario", base:110 },
{ id:"A20", nombre:"Destructor Supremo", raridad:"UR", base:250 }
];

//////////////////////////////////////////////////
// 🛡 20 ARMADURAS
//////////////////////////////////////////////////

const ARMADURAS = [
{ id:"AR1", nombre:"Armadura Tela", raridad:"Común" },
{ id:"AR2", nombre:"Armadura Cuero", raridad:"Común" },
{ id:"AR3", nombre:"Armadura Hierro", raridad:"Raro" },
{ id:"AR4", nombre:"Armadura Plata", raridad:"Raro" },
{ id:"AR5", nombre:"Armadura Cristal", raridad:"Beryraro" },
{ id:"AR6", nombre:"Armadura Mística", raridad:"Beryraro" },
{ id:"AR7", nombre:"Armadura Dragón", raridad:"Épico" },
{ id:"AR8", nombre:"Armadura Celeste", raridad:"Épico" },
{ id:"AR9", nombre:"Armadura Lunar", raridad:"Ultra Épico" },
{ id:"AR10", nombre:"Armadura Fantasma", raridad:"Ultra Épico" },
{ id:"AR11", nombre:"Armadura Solar", raridad:"Legendario" },
{ id:"AR12", nombre:"Armadura Abisal", raridad:"Legendario" },
{ id:"AR13", nombre:"Armadura Antigua", raridad:"UR" },
{ id:"AR14", nombre:"Armadura Suprema", raridad:"UR" },
{ id:"AR15", nombre:"Armadura Infinita", raridad:"UR" },
{ id:"AR16", nombre:"Escudo Épico", raridad:"Épico" },
{ id:"AR17", nombre:"Escudo Legendario", raridad:"Legendario" },
{ id:"AR18", nombre:"Escudo UR", raridad:"UR" },
{ id:"AR19", nombre:"Túnica Arcana", raridad:"Beryraro" },
{ id:"AR20", nombre:"Coraza Sagrada", raridad:"Ultra Épico" }
];

//////////////////////////////////////////////////
// 🐾 20 MASCOTAS
//////////////////////////////////////////////////

const MASCOTAS = [
{ id:"M1", nombre:"Gatito Blanco", raridad:"Común", buff:1.05 },
{ id:"M2", nombre:"Lobo Gris", raridad:"Común", buff:1.08 },
{ id:"M3", nombre:"Halcón Real", raridad:"Raro", buff:1.12 },
{ id:"M4", nombre:"Tortuga Guardiana", raridad:"Raro", buff:1.15 },
{ id:"M5", nombre:"Serpiente Mística", raridad:"Beryraro", buff:1.2 },
{ id:"M6", nombre:"Zorro Espiritual", raridad:"Beryraro", buff:1.25 },
{ id:"M7", nombre:"Mini Gólem", raridad:"Épico", buff:1.35 },
{ id:"M8", nombre:"Fénix Menor", raridad:"Épico", buff:1.4 },
{ id:"M9", nombre:"Grifo Joven", raridad:"Ultra Épico", buff:1.6 },
{ id:"M10", nombre:"Dragón Bebé", raridad:"Ultra Épico", buff:1.7 },
{ id:"M11", nombre:"León Dorado", raridad:"Legendario", buff:1.9 },
{ id:"M12", nombre:"Ángel Guardián", raridad:"Legendario", buff:2 },
{ id:"M13", nombre:"Dragón Antiguo", raridad:"UR", buff:2.5 },
{ id:"M14", nombre:"Fénix Supremo", raridad:"UR", buff:2.8 },
{ id:"M15", nombre:"Bestia Celestial", raridad:"UR", buff:3 },
{ id:"M16", nombre:"Gato Sombrío", raridad:"Épico", buff:1.38 },
{ id:"M17", nombre:"Cuervo Oscuro", raridad:"Beryraro", buff:1.22 },
{ id:"M18", nombre:"Caballo Fantasma", raridad:"Ultra Épico", buff:1.65 },
{ id:"M19", nombre:"Tigre Elemental", raridad:"Legendario", buff:2.1 },
{ id:"M20", nombre:"Lobo Supremo", raridad:"UR", buff:3.2 }
];

//////////////////////////////////////////////////
// 🎣 PECES + ⛏ MINERALES (para loot)
//////////////////////////////////////////////////

const PECES = [
{ id:"P1", nombre:"Pez Común", raridad:"Común" },
{ id:"P2", nombre:"Pez Dorado", raridad:"Beryraro" },
{ id:"P3", nombre:"Kraken Juvenil", raridad:"UR" }
];

const MINERALES = [
{ id:"MIN1", nombre:"Hierro", raridad:"Común" },
{ id:"MIN2", nombre:"Oro", raridad:"Beryraro" },
{ id:"MIN3", nombre:"Núcleo Dracónico", raridad:"UR" }
];

//////////////////////////////////////////////////
// 🔧 FUNCIONES BASE
//////////////////////////////////////////////////

function random(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

async function getUser(id){
  const { data } = await supabase.from("personajes").select("*").eq("id", id).single();
  return data;
}

async function updateUser(id, data){
  await supabase.from("personajes").update(data).eq("id", id);
}

//////////////////////////////////////////////////
// 📝 SLASH COMMANDS
//////////////////////////////////////////////////

const commands = [
  new SlashCommandBuilder().setName("elegirmagia")
    .setDescription("Crear personaje")
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
  new SlashCommandBuilder().setName("info").setDescription("Ver perfil"),
  new SlashCommandBuilder().setName("bag").setDescription("Ver mochila"),
  new SlashCommandBuilder().setName("balance").setDescription("Ver oro"),
  new SlashCommandBuilder().setName("minar").setDescription("Minar"),
  new SlashCommandBuilder().setName("pescar").setDescription("Pescar"),
  new SlashCommandBuilder().setName("aventura").setDescription("Aventura"),
  new SlashCommandBuilder().setName("pvp")
    .setDescription("Pelear contra jugador")
    .addUserOption(o=>o.setName("jugador").setDescription("Rival").setRequired(true))
].map(c=>c.toJSON());

client.once("ready", async ()=>{
  const rest = new REST({ version:"10" }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body:commands });
  console.log("🔥 Fairy Slayers MMO iniciado");
});//////////////////////////////////////////////////
// 🎮 SISTEMA PRINCIPAL
//////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {
if (!interaction.isChatInputCommand()) return;

const userId = interaction.user.id;
const cmd = interaction.commandName;

let user = await getUser(userId);

//////////////////////////////////////////////////
// ✨ CREAR PERSONAJE
//////////////////////////////////////////////////

if (cmd === "elegirmagia") {
  if (user) return interaction.reply("Ya tienes personaje creado.");

  const magia = interaction.options.getString("tipo");

  await supabase.from("personajes").insert({
    id: userId,
    magia,
    nivel: 1,
    xp: 0,
    oro: 500,
    oro_banco: 0,
    vida: 500,
    maxvida: 500,
    energia: 100,
    items: [],
    mascotas: []
  });

  return interaction.reply("✨ Personaje creado con 500 oro inicial.");
}

if (!user) return interaction.reply("No tienes personaje. Usa /elegirmagia");

//////////////////////////////////////////////////
// 🆙 SISTEMA DE NIVEL
//////////////////////////////////////////////////

function checkLevel(u){
  let xpNecesaria = u.nivel * 200;
  if(u.xp >= xpNecesaria){
    u.xp -= xpNecesaria;
    u.nivel += 1;
    u.maxvida += 50;
    u.vida = u.maxvida;
  }
  return u;
}

//////////////////////////////////////////////////
// ⚔ CÁLCULO DE DAÑO
//////////////////////////////////////////////////

function calcularDaño(u){
  let base = 20 + (u.nivel * 5);

  let arma = ARMAS.find(a=>a.id===u.arma_equipada);
  if(arma){
    base += arma.base;
    base *= RAREZA_MULT[arma.raridad];
  }

  let mascota = MASCOTAS.find(m=>m.id===u.mascota_activa);
  if(mascota){
    base *= mascota.buff;
  }

  return Math.floor(base);
}

function calcularDefensa(u){
  let armadura = ARMADURAS.find(a=>a.id===u.armadura_equipada);
  if(!armadura) return 0;
  return RAREZA_DEF[armadura.raridad];
}

//////////////////////////////////////////////////
// ⚔ BATALLA PVE
//////////////////////////////////////////////////

if(cmd === "aventura"){

  let dañoJugador = calcularDaño(user);
  let defensa = calcularDefensa(user);

  let enemigoVida = 200 + (user.nivel * 30);
  let dañoEnemigo = 30 + (user.nivel * 4);

  enemigoVida -= dañoJugador;

  let dañoRecibido = dañoEnemigo - defensa;
  if(dañoRecibido < 0) dañoRecibido = 0;

  user.vida -= dañoRecibido;
  if(user.vida < 0) user.vida = 0;

  let xpGanada = 150;
  let oroGanado = 120;

  user.xp += xpGanada;
  user.oro += oroGanado;

  user = checkLevel(user);

  await updateUser(userId, user);

  return interaction.reply(
`🏰 Aventura completada

⚔ Daño causado: ${dañoJugador}
🛡 Daño recibido: ${dañoRecibido}

+${xpGanada} XP
+${oroGanado} Oro

❤️ Vida: ${user.vida}/${user.maxvida}
Nivel: ${user.nivel}`
);
}

//////////////////////////////////////////////////
// ⛏ MINAR
//////////////////////////////////////////////////

if(cmd === "minar"){
  const mineral = random(MINERALES);
  user.items.push(mineral);
  await updateUser(userId, { items:user.items });
  return interaction.reply(`⛏ Encontraste ${mineral.nombre} (${mineral.raridad})`);
}

//////////////////////////////////////////////////
// 🎣 PESCAR
//////////////////////////////////////////////////

if(cmd === "pescar"){
  const pez = random(PECES);
  user.items.push(pez);
  await updateUser(userId, { items:user.items });
  return interaction.reply(`🎣 Pescaste ${pez.nombre} (${pez.raridad})`);
}

//////////////////////////////////////////////////
// 🎒 BAG
//////////////////////////////////////////////////

if(cmd === "bag"){
  if(!user.items.length) return interaction.reply("🎒 Mochila vacía.");
  let lista = user.items.map(i=>`${i.nombre} (${i.raridad})`).join("\n");
  return interaction.reply(`🎒 Mochila:\n${lista}`);
}

//////////////////////////////////////////////////
// 💰 BALANCE
//////////////////////////////////////////////////

if(cmd === "balance"){
  return interaction.reply(
`💰 Oro: ${user.oro}
🏦 Banco: ${user.oro_banco}`
);
}

//////////////////////////////////////////////////
// 👤 INFO
//////////////////////////////////////////////////

if(cmd === "info"){
  return interaction.reply(
`🧙 Magia: ${user.magia}
Nivel: ${user.nivel}
XP: ${user.xp}
Oro: ${user.oro}
Vida: ${user.vida}/${user.maxvida}`
);
}

});//////////////////////////////////////////////////
// ⚔ PVP POR TURNOS CON BOTONES
//////////////////////////////////////////////////

const pvpCombates = new Map();

client.on("interactionCreate", async interaction => {

if (interaction.isChatInputCommand() && interaction.commandName === "pvp") {

  const rival = interaction.options.getUser("jugador");
  if (rival.id === interaction.user.id)
    return interaction.reply("No puedes pelear contigo mismo.");

  const user1 = await getUser(interaction.user.id);
  const user2 = await getUser(rival.id);

  if (!user1 || !user2)
    return interaction.reply("Ambos jugadores deben tener personaje.");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aceptar_${interaction.user.id}`)
      .setLabel("Aceptar PvP")
      .setStyle(ButtonStyle.Success)
  );

  return interaction.reply({
    content: `⚔ ${rival}, ¿aceptas el duelo contra ${interaction.user.username}?`,
    components: [row]
  });
}

//////////////////////////////////////////////////
// 🎯 BOTÓN ACEPTAR
//////////////////////////////////////////////////

if (interaction.isButton() && interaction.customId.startsWith("aceptar_")) {

  const creadorId = interaction.customId.split("_")[1];

  if (interaction.user.id === creadorId)
    return interaction.reply({ content: "No puedes aceptar tu propio duelo.", ephemeral: true });

  const jugador1 = await getUser(creadorId);
  const jugador2 = await getUser(interaction.user.id);

  if (!jugador1 || !jugador2)
    return interaction.reply({ content: "Error jugadores.", ephemeral: true });

  const combateId = `${creadorId}_${interaction.user.id}`;

  pvpCombates.set(combateId, {
    turno: creadorId,
    vida1: jugador1.vida,
    vida2: jugador2.vida,
    id1: creadorId,
    id2: interaction.user.id
  });

  const botones = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`atacar_${combateId}`)
      .setLabel("⚔ Atacar")
      .setStyle(ButtonStyle.Danger)
  );

  return interaction.update({
    content: `🔥 PvP iniciado entre <@${creadorId}> y <@${interaction.user.id}>\nTurno de <@${creadorId}>`,
    components: [botones]
  });
}

//////////////////////////////////////////////////
// ⚔ BOTÓN ATACAR
//////////////////////////////////////////////////

if (interaction.isButton() && interaction.customId.startsWith("atacar_")) {

  const combateId = interaction.customId.replace("atacar_","");
  const combate = pvpCombates.get(combateId);

  if (!combate)
    return interaction.reply({ content:"Combate no encontrado.", ephemeral:true });

  if (interaction.user.id !== combate.turno)
    return interaction.reply({ content:"No es tu turno.", ephemeral:true });

  const jugador = await getUser(interaction.user.id);

  let daño = calcularDaño(jugador);

  if (interaction.user.id === combate.id1) {
    combate.vida2 -= daño;
    combate.turno = combate.id2;
  } else {
    combate.vida1 -= daño;
    combate.turno = combate.id1;
  }

  //////////////////////////////////////////////////
  // 💀 VERIFICAR MUERTE
  //////////////////////////////////////////////////

  if (combate.vida1 <= 0 || combate.vida2 <= 0) {

    const ganador = combate.vida1 > 0 ? combate.id1 : combate.id2;
    const perdedor = combate.vida1 > 0 ? combate.id2 : combate.id1;

    const userGanador = await getUser(ganador);

    userGanador.oro += 300;
    userGanador.xp += 200;

    await updateUser(ganador, userGanador);

    pvpCombates.delete(combateId);

    return interaction.update({
      content: `🏆 <@${ganador}> ganó el PvP!\n+300 oro\n+200 XP`,
      components:[]
    });
  }

  //////////////////////////////////////////////////
  // 🔄 SIGUE COMBATE
  //////////////////////////////////////////////////

  pvpCombates.set(combateId, combate);

  const botones = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`atacar_${combateId}`)
      .setLabel("⚔ Atacar")
      .setStyle(ButtonStyle.Danger)
  );

  return interaction.update({
    content:
`⚔ PvP en curso

❤️ <@${combate.id1}>: ${combate.vida1}
❤️ <@${combate.id2}>: ${combate.vida2}

Turno de <@${combate.turno}>`,
    components:[botones]
  });
}

});

//////////////////////////////////////////////////
// 🚀 LOGIN FINAL
//////////////////////////////////////////////////

client.login(process.env.TOKEN);
