// Importar dependencias correctamente
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
require('dotenv').config();

// ------------------------------
// SERVIDOR WEB PARA RENDER
// ------------------------------
const app = express();
app.get('/', (req, res) => {
  res.send('✅ Bot Fairy Tail Activo | Comandos / disponibles!');
});
app.listen(process.env.PORT || 3000, () => {
  console.log(`📡 Servidor web corriendo en puerto ${process.env.PORT || 3000}`);
});

// ------------------------------
// CONFIGURACIÓN DEL BOT DISCORD
// ------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,          
    GatewayIntentBits.MessageContent    
  ]
});

// ------------------------------
// DATOS DEL SERVIDOR Y COMANDOS
// ------------------------------
// ID DE TU SERVIDOR YA PUESTO: 1461066789545836793
const GUILD_ID = "1461066789545836793"; 
const APP_ID = client.user?.id;

// COMANDOS SLASH ACTUALIZADOS
const commands = [
  {
    name: 'ayuda',
    description: 'Muestra la ayuda del bot'
  },
  {
    name: 'perfil',
    description: 'Muestra tu perfil de Fairy Tail'
  },
  {
    name: 'elegirmagia',
    description: 'Crea tu personaje y elige tu magia'
  }
];

// ------------------------------
// SINCRONIZAR COMANDOS EN TU SERVIDOR
// ------------------------------
client.on('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  
  // Actualizar comandos DIRECTAMENTE EN TU SERVIDOR
  await rest.put(
    Routes.applicationGuildCommands(APP_ID, GUILD_ID),
    { body: commands }
  ).then(() => {
    console.log('✅ Comandos actualizados en el servidor!');
  }).catch(err => {
    console.error('❌ Error al sincronizar comandos:', err.message);
  });
});

// ------------------------------
// ESCUCHAR COMANDOS
// ------------------------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  switch(interaction.commandName) {
    case 'ayuda':
      await interaction.reply('📚 **AYUDA BOT FAIRY TAIL**\n/perfil → Ver tu personaje\n/elegirmagia → Crear personaje');
      break;
    case 'perfil':
      await interaction.reply('👤 Tu perfil se está cargando...');
      break;
  }
});

// ------------------------------
// INICIAR BOT CON DATOS CORRECTOS
// ------------------------------
client.login(process.env.TOKEN).then(() => {
  console.log('✅ Bot en línea y listo!');
}).catch(err => {
  console.error('❌ Error al iniciar:', err.message);
});
