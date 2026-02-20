require('dotenv').config();
const express = require("express");
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const app = express();
app.get("/", (req, res) => res.send("MMO Online"));
app.listen(10000, () => console.log("Servidor web activo"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const CLIENT_ID = process.env.CLIENT_ID;

/* =========================
   SISTEMA BASE
========================= */

function dañoBase(clase) {
  if (clase === "Guerrero") return 15;
  if (clase === "Mago") return 12;
  if (clase === "Arquero") return 18;
  return 10;
}

function rarezaRandom() {
  const r = Math.random();
  if (r < 0.5) return "Comun";
  if (r < 0.75) return "Raro";
  if (r < 0.9) return "Epico";
  if (r < 0.98) return "Legendario";
  return "UR";
}

function rangoPorNivel(nivel) {
  if (nivel >= 30) return "Maestro";
  if (nivel >= 20) return "Elite";
  if (nivel >= 10) return "Avanzado";
  return "Novato";
}

/* =========================
   COMANDOS
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName("crear")
    .setDescription("Crear personaje")
    .addStringOption(o =>
      o.setName("clase")
        .setDescription("Elige clase")
        .setRequired(true)
        .addChoices(
          { name: "Guerrero", value: "Guerrero" },
          { name: "Mago", value: "Mago" },
          { name: "Arquero", value: "Arquero" }
        )
    ),

  new SlashCommandBuilder().setName("perfil").setDescription("Ver perfil"),
  new SlashCommandBuilder().setName("combatir").setDescription("Pelear contra enemigo"),
  new SlashCommandBuilder().setName("balance").setDescription("Ver dinero"),
  new SlashCommandBuilder().setName("depositar")
    .setDescription("Depositar al banco")
    .addIntegerOption(o => o.setName("cantidad").setRequired(true)),
  new SlashCommandBuilder().setName("retirar")
    .setDescription("Retirar del banco")
    .addIntegerOption(o => o.setName("cantidad").setRequired(true)),
  new SlashCommandBuilder().setName("ranking").setDescription("Top jugadores"),
  new SlashCommandBuilder().setName("duelo")
    .setDescription("Retar jugador")
    .addUserOption(o => o.setName("usuario").setRequired(true))
].map(c => c.toJSON());

client.once("clientReady", async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("Comandos registrados");
});

/* =========================
   INTERACCIONES
========================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;

  /* CREAR */
  if (interaction.commandName === "crear") {
    const clase = interaction.options.getString("clase");

    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) return interaction.reply("Ya tienes personaje.");

    await supabase.from("players").insert({
      id: userId,
      clase,
      nivel: 1,
      xp: 0,
      oro: 100,
      vida: 100,
      mana: 50
    });

    return interaction.reply(`Personaje creado como ${clase}`);
  }

  /* PERFIL */
  if (interaction.commandName === "perfil") {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data) return interaction.reply("No tienes personaje.");

    const embed = new EmbedBuilder()
      .setTitle("Perfil MMO")
      .addFields(
        { name: "Clase", value: data.clase, inline: true },
        { name: "Nivel", value: data.nivel.toString(), inline: true },
        { name: "Rango", value: rangoPorNivel(data.nivel), inline: true },
        { name: "XP", value: data.xp.toString(), inline: true },
        { name: "Oro", value: data.oro.toString(), inline: true },
        { name: "Banco", value: data.banco.toString(), inline: true }
      );

    return interaction.reply({ embeds: [embed] });
  }

  /* COMBATE */
  if (interaction.commandName === "combatir") {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (!data) return interaction.reply("No tienes personaje.");

    const enemigoVida = 50 + data.nivel * 10;
    const dañoJugador = dañoBase(data.clase) + Math.floor(Math.random() * 10);
    const dañoEnemigo = Math.floor(Math.random() * 15);

    const gana = dañoJugador >= dañoEnemigo;

    let nuevaXP = data.xp;
    let nuevoOro = data.oro;

    if (gana) {
      nuevaXP += 50;
      nuevoOro += 30;
    }

    let nuevoNivel = data.nivel;
    if (nuevaXP >= nuevoNivel * 100) {
      nuevoNivel++;
      nuevaXP = 0;
    }

    await supabase.from("players")
      .update({
        xp: nuevaXP,
        nivel: nuevoNivel,
        oro: nuevoOro
      })
      .eq("id", userId);

    return interaction.reply(
      gana
        ? `⚔ Ganaste! +50 XP +30 Oro`
        : `💀 Perdiste contra el enemigo`
    );
  }

  /* BALANCE */
  if (interaction.commandName === "balance") {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    return interaction.reply(`💰 Oro: ${data.oro}\n🏦 Banco: ${data.banco}`);
  }

  /* DEPOSITAR */
  if (interaction.commandName === "depositar") {
    const cantidad = interaction.options.getInteger("cantidad");

    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (data.oro < cantidad) return interaction.reply("No tienes suficiente oro.");

    await supabase.from("players")
      .update({
        oro: data.oro - cantidad,
        banco: data.banco + cantidad
      })
      .eq("id", userId);

    return interaction.reply(`Depositaste ${cantidad}`);
  }

  /* RETIRAR */
  if (interaction.commandName === "retirar") {
    const cantidad = interaction.options.getInteger("cantidad");

    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();

    if (data.banco < cantidad) return interaction.reply("No tienes suficiente en banco.");

    await supabase.from("players")
      .update({
        oro: data.oro + cantidad,
        banco: data.banco - cantidad
      })
      .eq("id", userId);

    return interaction.reply(`Retiraste ${cantidad}`);
  }

  /* RANKING */
  if (interaction.commandName === "ranking") {
    const { data } = await supabase
      .from("players")
      .select("*")
      .order("nivel", { ascending: false })
      .limit(5);

    let texto = "";
    data.forEach((p, i) => {
      texto += `#${i + 1} Nivel ${p.nivel}\n`;
    });

    return interaction.reply(`🏆 Top Jugadores\n${texto}`);
  }

  /* DUELO SIMPLE */
  if (interaction.commandName === "duelo") {
    const usuario = interaction.options.getUser("usuario");
    if (usuario.id === userId) return interaction.reply("No puedes retarte.");

    const { data: p1 } = await supabase.from("players").select("*").eq("id", userId).single();
    const { data: p2 } = await supabase.from("players").select("*").eq("id", usuario.id).single();

    if (!p1 || !p2) return interaction.reply("Ambos deben tener personaje.");

    const daño1 = dañoBase(p1.clase) + Math.random() * 10;
    const daño2 = dañoBase(p2.clase) + Math.random() * 10;

    const ganador = daño1 > daño2 ? interaction.user.username : usuario.username;

    return interaction.reply(`⚔ Duelo!\nGanador: ${ganador}`);
  }
});

client.login(process.env.TOKEN);
