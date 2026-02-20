// Importar dependencias correctamente
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
require('dotenv').config("MTQ3MzI5Njc0OTE5NTE2NTg0OA.GxZWQ1.L22OTO9cZDF-_Giz1AnKP7r-NkYJ4I5PzZWeBo");

TOKEN = ('dotenv')

// ------------------------------
// SERVIDOR WEB CON ESTADO REAL
// ------------------------------
const app = express();
let botEstado = "❌ Bot NO CONECTADO - Revisa el token!";

app.get('/', (req, res) => {
  res.send(`✅ Servidor Web LIVE | Estado del Bot: ${botEstado}`);
});
app.listen(process.env.PORT || 3000, () => console.log(`📡 Servidor web en puerto ${process.env.PORT || 3000}`));

// ------------------------------
// CONFIGURACIÓN DEL BOT
// ------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent
  ]
});

// ------------------------------
// MANEJO DE ESTADO
// ------------------------------
client.on('ready', () => {
  botEstado = `✅ Bot Fairy Slayers LIVE y conectado como ${client.user.tag}`;
  console.log(botEstado);
});

// ------------------------------
// INICIO CON CONTROL DE ERROR
// ------------------------------
client.login(process.env.TOKEN).then(() => {
  console.log("✅ Conexión exitosa al bot");
}).catch(err => {
  botEstado = `❌ ERROR: Token inválido o problema con los intents`;
  console.error("❌", err.message);
});
