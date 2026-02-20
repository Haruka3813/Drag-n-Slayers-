require("dotenv").config();

const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("Fairy Slayers activo"));
app.listen(10000, () => console.log("Servidor web activo en puerto 10000"));

if (!process.env.TOKEN) {
  console.log("❌ TOKEN no encontrado en Environment Variables");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function calcularVidaActual(personaje) {
  const ahora = Date.now();
  const tiempoPasado = (ahora - (personaje.last_battle || ahora)) / 1000;

  const vidaMax = personaje.vida_max;
  const regeneracionPorSegundo = vidaMax / 60;

  let vida = personaje.vida + (tiempoPasado * regeneracionPorSegundo);

  if (vida > vidaMax) vida = vidaMax;

  return Math.floor(vida);
}

const comandos = [
  {
    name: "elegirmagia",
    description: "Elegir tu magia inicial",
    options: [
      {
        name: "tipo",
        description: "Tipo de magia",
        type: 3,
        required: true,
        choices: [
          { name: "Dragon Slayer", value: "dragon" },
          { name: "Celestial", value: "celestial" }
        ]
      }
    ]
  },
  {
    name: "info",
    description: "Ver tu personaje"
  },
  {
    name: "batalla",
    description: "Luchar contra un enemigo salvaje"
  }
];

client.once("clientReady", async () => {
  console.log(`✅ Conectado como ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: comandos }
    );
    console.log("✅ Comandos slash registrados");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "elegirmagia") {
    const magia = interaction.options.getString("tipo");

    const { data: existente } = await supabase
      .from("personajes")
      .select("*")
      .eq("user_id", interaction.user.id)
      .single();

    if (existente) {
      return interaction.reply("❌ Ya tienes personaje.");
    }

    await supabase.from("personajes").insert({
      user_id: interaction.user.id,
      magia: magia,
      nivel: 1,
      xp: 0,
      oro: 0,
      vida: 500,
      vida_max: 500,
      last_battle: Date.now()
    });

    interaction.reply(`✨ Personaje creado con magia ${magia}`);
  }

  if (interaction.commandName === "info") {
    const { data: personaje } = await supabase
      .from("personajes")
      .select("*")
      .eq("user_id", interaction.user.id)
      .single();

    if (!personaje) {
      return interaction.reply("❌ No tienes personaje.");
    }

    const vidaActual = calcularVidaActual(personaje);

    interaction.reply(
      `🧙 **Tu Personaje**
Magia: ${personaje.magia}
Nivel: ${personaje.nivel}
XP: ${personaje.xp}
Oro: ${personaje.oro}
Vida: ${vidaActual}/${personaje.vida_max}`
    );
  }

  if (interaction.commandName === "batalla") {

    const { data: personaje } = await supabase
      .from("personajes")
      .select("*")
      .eq("user_id", interaction.user.id)
      .single();

    if (!personaje) {
      return interaction.reply("❌ No tienes personaje. Usa /elegirmagia primero.");
    }

    let vidaJugador = calcularVidaActual(personaje);
    let ataqueJugador = 20 + personaje.nivel * 5;

    let enemigoVida = 50 + personaje.nivel * 20;
    let enemigoAtaque = 10 + personaje.nivel * 3;

    let log = `⚔️ **BATALLA INICIADA**\n\n`;

    while (vidaJugador > 0 && enemigoVida > 0) {

      enemigoVida -= ataqueJugador;
      log += `🧙 Tú golpeas y haces ${ataqueJugador} daño\n`;

      if (enemigoVida <= 0) break;

      vidaJugador -= enemigoAtaque;
      log += `👹 Enemigo golpea y hace ${enemigoAtaque} daño\n\n`;
    }

    if (vidaJugador <= 0) {
      await supabase
        .from("personajes")
        .update({
          vida: 0,
          last_battle: Date.now()
        })
        .eq("user_id", interaction.user.id);

      return interaction.reply(log + "\n💀 Has perdido la batalla.");
    }

    const oroGanado = Math.floor(Math.random() * 200) + 100;
    const nuevaXp = personaje.xp + 100;

    await supabase
      .from("personajes")
      .update({
        xp: nuevaXp,
        oro: personaje.oro + oroGanado,
        vida: vidaJugador,
        last_battle: Date.now()
      })
      .eq("user_id", interaction.user.id);

    interaction.reply(
      log +
      `\n🏆 Has ganado!\n✨ +100 XP\n💰 +${oroGanado} oro`
    );
  }
});

client.login(process.env.TOKEN);
