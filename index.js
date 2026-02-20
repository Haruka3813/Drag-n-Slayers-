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
app.get("/", (req, res) => res.send("Fairy Slayers Fase 3 activo"));
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
  new SlashCommandBuilder().setName("batalla").setDescription("Buscar enemigo"),
  new SlashCommandBuilder().setName("betatester").setDescription("Recompensa beta"),
  new SlashCommandBuilder().setName("miau").setDescription("Recibir mascota inicial"),
  new SlashCommandBuilder().setName("tienda").setDescription("Ver y comprar items"),
  new SlashCommandBuilder().setName("gremio").setDescription("Ver o unirse a gremio"),
  new SlashCommandBuilder().setName("sorteo").setDescription("Sorteos automáticos"),
  new SlashCommandBuilder().setName("aventura").setDescription("Modo aventura automática"),
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
      id: userId, magia, nivel: 1, xp: 0, oro: 0,
      vida: 500, maxvida: 500, lastbatalla: Date.now(),
      mascotas: [], arma_equipada: null, regeneracion: Date.now()
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
Oro: ${data.oro}
Vida: ${data.vida}/${data.maxvida}
Arma equipada: ${arma}
Mascotas: ${mascotas}`
    );
  }

  // --------------------
  // Batalla PvP
  // --------------------
  if (interaction.commandName === "batalla") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");

    // Regenerar vida automáticamente
    const tiempoPasado = Date.now() - data.regeneracion;
    let vidaRecuperada = Math.floor(tiempoPasado / 60000) * data.maxvida;
    let vidaActual = data.vida + vidaRecuperada;
    if (vidaActual > data.maxvida) vidaActual = data.maxvida;

    // Buscar enemigo PvP disponible
    const { data: enemigos } = await supabase.from("personajes")
      .select("*").neq("id", userId).limit(1);

    if (!enemigos?.length) return interaction.reply("No hay enemigos disponibles ahora.");

    const enemigo = enemigos[0];
    let vidaEnemigo = enemigo.vida;

    // Simular combate simple: 30% de daño aleatorio
    const danoJugador = Math.floor(Math.random() * 150) + 50;
    const danoEnemigo = Math.floor(Math.random() * 100) + 50;

    vidaActual -= danoEnemigo; if (vidaActual < 0) vidaActual = 0;
    vidaEnemigo -= danoJugador; if (vidaEnemigo < 0) vidaEnemigo = 0;

    // Actualizar ambos jugadores
    await actualizarPersonaje(userId, { vida: vidaActual, xp: data.xp + 100, oro: data.oro + 50, lastbatalla: Date.now(), regeneracion: Date.now() });
    await actualizarPersonaje(enemigo.id, { vida: vidaEnemigo });

    return interaction.reply(
`⚔️ Batalla PvP completada!
Tú infligiste: ${danoJugador} daño
Enemigo infligió: ${danoEnemigo} daño
Tu vida: ${vidaActual}/${data.maxvida}
Vida enemigo: ${vidaEnemigo}/${enemigo.maxvida}`
    );
  }

  // --------------------
  // Beta tester
  // --------------------
  if (interaction.commandName === "betatester") {
    await actualizarPersonaje(userId, { xp: 3000, oro: 5000 });
    return interaction.reply("🎁 Recompensa beta aplicada.");
  }

  // --------------------
  // Mascota inicial
  // --------------------
  if (interaction.commandName === "miau") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");
    const nuevaMascota = { id: `mascota_${Date.now()}`, nombre: "UR Inicial", tipo: "UR", bonus_vida: 50, bonus_xp: 50, bonus_oro: 50 };
    const mascotasActuales = data.mascotas || [];
    mascotasActuales.push(nuevaMascota);
    await actualizarPersonaje(userId, { mascotas: mascotasActuales });
    return interaction.reply(`🐾 Has recibido tu mascota UR: ${nuevaMascota.nombre}`);
  }

  // --------------------
  // Tienda
  // --------------------
  if (interaction.commandName === "tienda") {
    const items = await supabase.from("items").select("*").limit(10);
    let lista = items.data.map(i => `${i.nombre} (${i.rareza})`).join("\n") || "No hay items disponibles";
    return interaction.reply(`🛒 **Tienda**\n${lista}`);
  }

  // --------------------
  // Gremio
  // --------------------
  if (interaction.commandName === "gremio") {
    return interaction.reply("🛡️ Comandos de gremio próximamente...");
  }

  // --------------------
  // Sorteo automático
  // --------------------
  if (interaction.commandName === "sorteo") {
    return interaction.reply("🎲 Sorteos automáticos activados...");
  }

  // --------------------
  // Aventura automática
  // --------------------
  if (interaction.commandName === "aventura") {
    return interaction.reply("🏹 Modo aventura automático iniciado...");
  }

  // --------------------
  // Ayuda
  // --------------------
  if (interaction.commandName === "ayuda") {
    return interaction.reply(
`📘 Fairy Slayers Fase 3

/elegirmagia
/info
/batalla
/betatester
/miau
/tienda
/gremio
/sorteo
/aventura`
    );
  }
});

client.login(process.env.TOKEN);
