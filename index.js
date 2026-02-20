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
app.get("/", (req, res) => res.send("Fairy Slayers Fase 2 activo"));
app.listen(10000, () => console.log("Servidor web activo en puerto 10000"));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const CLIENT_ID = process.env.CLIENT_ID;

// ==========================
// Comandos slash
// ==========================
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
    .setDescription("Ver tu perfil completo"),
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
    .setName("tienda")
    .setDescription("Ver y comprar items"),
  new SlashCommandBuilder()
    .setName("ayuda")
    .setDescription("Ver comandos")
].map(cmd => cmd.toJSON());

// ==========================
// Registrar comandos
// ==========================
client.once("ready", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log("✅ Comandos slash registrados");
});

// ==========================
// Funciones auxiliares
// ==========================
async function getPersonaje(userId) {
  const { data } = await supabase
    .from("personajes")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
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
      id: userId,
      magia: magia,
      nivel: 1,
      xp: 0,
      oro: 0,
      vida: 500,
      maxvida: 500,
      lastbatalla: Date.now(),
      mascotas: [],
      arma_equipada: null,
      regeneracion: Date.now()
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
  // Batalla PvE (simplificada)
  // --------------------
  if (interaction.commandName === "batalla") {
    const data = await getPersonaje(userId);
    if (!data) return interaction.reply("No tienes personaje.");

    // Vida regenerada automáticamente según tiempo
    const tiempoPasado = Date.now() - data.regeneracion;
    const vidaRecuperada = Math.floor(tiempoPasado / 60000) * data.maxvida; // 1 min = 100% vida
    let vidaActual = data.vida + vidaRecuperada;
    if (vidaActual > data.maxvida) vidaActual = data.maxvida;

    // Simular batalla
    const dano = 100;
    let nuevaVida = vidaActual - dano;
    if (nuevaVida < 0) nuevaVida = 0;

    await supabase.from("personajes")
      .update({
        vida: nuevaVida,
        xp: data.xp + 100,
        oro: data.oro + 50,
        lastbatalla: Date.now(),
        regeneracion: Date.now()
      })
      .eq("id", userId);

    return interaction.reply(
      `⚔️ Batalla completada!
+100 XP
+50 Oro
Vida restante: ${nuevaVida}`
    );
  }

  // --------------------
  // Beta tester
  // --------------------
  if (interaction.commandName === "betatester") {
    await supabase.from("personajes")
      .update({ xp: 3000, oro: 5000 })
      .eq("id", userId);
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

    await supabase.from("personajes")
      .update({ mascotas: mascotasActuales })
      .eq("id", userId);

    return interaction.reply(`🐾 Has recibido tu mascota UR: ${nuevaMascota.nombre}`);
  }

  // --------------------
  // Tienda
  // --------------------
  if (interaction.commandName === "tienda") {
    // Ejemplo simplificado
    const items = await supabase.from("items").select("*").limit(10);
    let lista = items.data.map(i => `${i.nombre} (${i.rareza})`).join("\n") || "No hay items disponibles";
    return interaction.reply(`🛒 **Tienda**\n${lista}`);
  }

  // --------------------
  // Ayuda
  // --------------------
  if (interaction.commandName === "ayuda") {
    return interaction.reply(
`📘 Fairy Slayers Fase 2

/elegirmagia
/info
/batalla
/betatester
/miau
/tienda`
    );
  }
});

client.login(process.env.TOKEN);
