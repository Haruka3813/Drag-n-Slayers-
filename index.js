const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
require('dotenv').config();

// Servidor web
const app = express();
app.get('/', (req, res) => res.send('✅ Bot Fairy Tail Activo (Versión Actualizada)'));
app.listen(process.env.PORT || 3000, () => console.log(`Servidor en puerto ${process.env.PORT || 3000}`));

// Bot Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContentIntent]
});

// Sincronizar comandos
const commands = [
  { name: 'ayuda', description: 'Muestra la ayuda del bot' }
];

client.on('ready', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  new REST({ version: '10' }).put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.login(process.env.TOKEN).catch(err => console.error('❌ Error:', err.message));
