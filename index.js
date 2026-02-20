import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// ===========================
// CONFIG BOT & SUPABASE
// ===========================
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ===========================
// FUNCIONES GENERALES
// ===========================

// Obtener jugador
async function getPlayer(id) {
    const { data } = await supabase.from('players').select('*').eq('id', id).single();
    return data;
}

// Crear jugador si no existe
async function createPlayer(id, clase='Novato') {
    const player = await getPlayer(id);
    if (!player) {
        await supabase.from('players').insert({ id, clase, subclase: '', nivel:1, xp:0, oro:100, banco:0, vida:100, mana:50 });
    }
}

// Incrementar oro
async function addOro(uid, cantidad) {
    await supabase.rpc('increment_oro', { uid, cantidad });
}

// ===========================
// COMANDOS MMO
// ===========================

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    // -------------------
    // /balance
    // -------------------
    if(cmd === '/balance') {
        await createPlayer(message.author.id);
        const player = await getPlayer(message.author.id);
        message.reply(`💰 Oro: ${player.oro} | 🏦 Banco: ${player.banco}`);
    }

    // -------------------
    // /bag
    // -------------------
    if(cmd === '/bag') {
        await createPlayer(message.author.id);
        const { data: inventario } = await supabase.from('inventario').select('item_id, cantidad, items(*)').eq('player_id', message.author.id);
        if(!inventario || inventario.length === 0) return message.reply("📦 Tu inventario está vacío");
        let invText = "📦 Inventario:\n";
        inventario.forEach(i => invText += `${i.items.nombre} x${i.cantidad} (${i.items.rareza})\n`);
        message.reply(invText);
    }

    // -------------------
    // /usar
    // -------------------
    if(cmd === '/usar') {
        const itemName = args.join(' ');
        if(!itemName) return message.reply("❌ Debes indicar el nombre del item a usar");
        const { data: itemData } = await supabase.from('items').select('*').ilike('nombre', itemName).single();
        if(!itemData) return message.reply("❌ Item no encontrado");
        message.reply(`✅ Has usado ${itemData.nombre} (${itemData.rareza})`);
        // Aquí se puede agregar lógica de efectos según tipo
    }

    // -------------------
    // /mascotas
    // -------------------
    if(cmd === '/mascotas') {
        await createPlayer(message.author.id);
        const { data: pets } = await supabase.from('inventario').select('item_id, cantidad, items(*)').eq('player_id', message.author.id).eq('items.tipo','pet');
        if(!pets || pets.length === 0) return message.reply("🐾 No tienes mascotas");
        let petText = "🐾 Tus mascotas:\n";
        pets.forEach(p => petText += `${p.items.nombre} (${p.items.rareza}) - ${p.items.efecto}\n`);
        message.reply(petText);
    }

    // -------------------
    // /equipar
    // -------------------
    if(cmd === '/equipar') {
        const itemName = args.join(' ');
        if(!itemName) return message.reply("❌ Debes indicar el nombre del item a equipar");
        const { data: itemData } = await supabase.from('items').select('*').ilike('nombre', itemName).single();
        if(!itemData) return message.reply("❌ Item no encontrado");
        message.reply(`⚔️ Has equipado ${itemData.nombre}`);
        // Aquí se puede agregar lógica de buffs de armas o mascotas
    }

    // -------------------
    // /minar
    // -------------------
    if(cmd === '/minar') {
        await createPlayer(message.author.id);
        const { data: minerals } = await supabase.from('items').select('*').eq('tipo','mineral');
        const loot = minerals[Math.floor(Math.random()*minerals.length)];
        await supabase.from('inventario').insert({ player_id: message.author.id, item_id: loot.id, cantidad:1 });
        message.reply(`⛏ Has minado: ${loot.nombre} (${loot.rareza})`);
    }

    // -------------------
    // /pescar
    // -------------------
    if(cmd === '/pescar') {
        await createPlayer(message.author.id);
        const { data: fishes } = await supabase.from('items').select('*').eq('tipo','fish');
        const loot = fishes[Math.floor(Math.random()*fishes.length)];
        await supabase.from('inventario').insert({ player_id: message.author.id, item_id: loot.id, cantidad:1 });
        message.reply(`🎣 Has pescado: ${loot.nombre} (${loot.rareza})`);
    }

    // -------------------
    // /tienda
    // -------------------
    if(cmd === '/tienda') {
        const { data: marketItems } = await supabase.from('market').select('item_id, precio, items(*)');
        let text = "🛒 Tienda global:\n";
        marketItems.forEach(m => text += `${m.items.nombre} (${m.items.rareza}) - ${m.precio} oro\n`);
        message.reply(text);
    }

    // -------------------
    // /misiones
    // -------------------
    if(cmd === '/misiones') {
        const { data: misiones } = await supabase.from('misiones').select('*');
        let text = "📜 Misiones disponibles:\n";
        misiones.forEach(m => text += `${m.nombre} (Nivel mínimo: ${m.nivel_min}) - XP:${m.recompensa_xp} Oro:${m.recompensa_oro}\n`);
        message.reply(text);
    }

    // -------------------
    // /combate
    // -------------------
    if(cmd === '/combate') {
        await createPlayer(message.author.id);
        const { data: enemigos } = await supabase.from('enemigos').select('*');
        const enemy = enemigos[Math.floor(Math.random()*enemigos.length)];
        message.reply(`⚔️ Te has encontrado con ${enemy.nombre} (Vida: ${enemy.vida})`);
        // Aquí se puede agregar lógica de combate, XP y drops
    }

    // -------------------
    // /ranking
    // -------------------
    if(cmd === '/ranking') {
        const { data: players } = await supabase.from('players').select('*').order('xp', { ascending:false }).limit(10);
        let text = "🏆 Top 10 Jugadores:\n";
        players.forEach((p,i) => text += `${i+1}. <@${p.id}> - Nivel ${p.nivel} XP:${p.xp} Oro:${p.oro}\n`);
        message.reply(text);
    }
});

// ===========================
// LOGIN BOT
// ===========================
client.login(process.env.TOKEN);
