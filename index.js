// Importar dependencias correctamente
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
require('dotenv').config();

// ------------------------------
// SERVIDOR WEB PARA RENDER
// ------------------------------
const app = express();
app.get('/', (req, res) => {
  res.send('✅ Bot Fairy Slayers listo y funcionando!');
});
app.listen(process.env.PORT || 3000, () => {
  console.log(`📡 Servidor web en puerto ${process.env.PORT || 3000}`);
});

// ------------------------------
// CONFIGURACIÓN DEL BOT FAIRY SLAYERS
// ------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent
  ]
});

// COMANDOS SLASH DISPONIBLES
const commands = [
  {
    name: 'ayuda',
    description: 'Muestra la ayuda del bot Fairy Slayers'
  },
  {
    name: 'perfil',
    description: 'Muestra tu perfil de Fairy Slayers'
  },
  {
    name: 'elegirmagia',
    description: 'Elige tu magia en Fairy Slayers'
  }
];

// SINCRONIZAR COMANDOS
client.on('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  
  await rest.put(
    Routes.applicationGuildCommands(client.user.id, '1461066789545836793'), // ID de tu servidor
    { body: commands }
  ).then(() => console.log('✅ Comandos sincronizados'))
  .catch(err => console.error('❌ Error:', err));
});

// RESPONDER A COMANDOS
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  switch(interaction.commandName) {
    case 'ayuda':
      await interaction.reply('📚 **AYUDA FAIRY SLAYERS**\n/perfil → Ver perfil\n/elegirmagia → Elegir magia');
      break;
    case 'perfil':
      await interaction.reply('👤 Tu perfil de Fairy Slayers se está cargando...');
      break;
    case 'elegirmagia':
      await interaction.reply('✨ Elige tu magia: Dragón Slayer, Celestial, Requip, Sombras o Hadas');
      break;
  }
});

// INICIAR BOT
client.login(process.env.TOKEN).then(() => {
  console.log('✅ Bot Fairy Slayers en línea!');
}).catch(err => {
  console.error('❌ Error al iniciar:', err.message);
});
