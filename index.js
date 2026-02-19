// Importar dependencias correctamente
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
require('dotenv').config();

// ------------------------------
// SERVIDOR WEB PARA RENDER
// ------------------------------
const app = express();
app.get('/', (req, res) => {
  res.send('✅ Bot Fairy slayers listo y funcionando!');
});
app.listen(process.env.PORT || 3000, () => {
  console.log(`📡 Servidor web en puerto ${process.env.PORT || 3000}`);
});

// ------------------------------
// CONFIGURACIÓN DEL BOT DE DISCORD
// ------------------------------
// Intents VÁLIDOS (sin errores de BitField)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,          // Intent válido
    GatewayIntentBits.MessageContent    // Intent válido (sin "Intent" al final)
  ]
});

// Comandos de ejemplo
const commands = [
  {
    name: 'ayuda',
    description: 'Muestra la ayuda del bot'
  },
  {
    name: 'perfil',
    description: 'Muestra el perfil de tu personaje'
  }
];

// ------------------------------
// EVENTOS DEL BOT
// ------------------------------
client.on('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  
  // Sincronizar comandos (sin errores)
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  ).then(() => console.log('✅ Comandos sincronizados correctamente'))
  .catch(err => console.error('❌ Error al sincronizar:', err.message));
});

// ------------------------------
// INICIAR EL BOT
// ------------------------------
client.login(process.env.TOKEN).catch(err => {
  console.error('❌ Error al iniciar:', err.message);
  console.log('💡 Revisa los intents y la versión de Node.js');
});
