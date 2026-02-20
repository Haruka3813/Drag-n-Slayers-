require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const { REST } = require('@discordjs/rest');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const XP_POR_NIVEL = 100;
const INTERES_BANCO = 0.05;

/* =============================
   FUNCIONES BASE
============================= */

async function obtenerJugador(userId) {
    let { data } = await supabase
        .from('players')
        .select('*')
        .eq('id', userId)
        .single();

    if (!data) {
        const nuevo = {
            id: userId,
            nivel: 1,
            xp: 0,
            oro: 100,
            banco: 0,
            arma_equipped: null,
            mascota_activa: null
        };

        await supabase.from('players').insert(nuevo);
        return nuevo;
    }

    return data;
}

async function agregarXP(userId, cantidad) {
    let jugador = await obtenerJugador(userId);
    let nuevoXP = jugador.xp + cantidad;
    let nuevoNivel = jugador.nivel;

    while (nuevoXP >= XP_POR_NIVEL) {
        nuevoXP -= XP_POR_NIVEL;
        nuevoNivel++;
    }

    await supabase
        .from('players')
        .update({ xp: nuevoXP, nivel: nuevoNivel })
        .eq('id', userId);

    return { nivel: nuevoNivel, xp: nuevoXP };
}

function colorRareza(r) {
    if (r === "legendario") return 0xffd700;
    if (r === "epico") return 0x9b59b6;
    if (r === "raro") return 0x3498db;
    return 0xffffff;
}

/* =============================
   SLASH COMMANDS
============================= */

const commands = [
    new SlashCommandBuilder().setName('perfil').setDescription('Ver tu perfil'),
    new SlashCommandBuilder().setName('balance').setDescription('Ver tu oro'),
    new SlashCommandBuilder().setName('trabajar').setDescription('Ganar oro y XP'),
    new SlashCommandBuilder().setName('loot').setDescription('Buscar objeto'),
    new SlashCommandBuilder().setName('bag').setDescription('Ver inventario'),
    new SlashCommandBuilder()
        .setName('equipar')
        .setDescription('Equipar arma')
        .addStringOption(o => o.setName('id').setDescription('ID del item').setRequired(true)),
    new SlashCommandBuilder()
        .setName('usar')
        .setDescription('Usar item')
        .addStringOption(o => o.setName('id').setDescription('ID del item').setRequired(true)),
    new SlashCommandBuilder()
        .setName('depositar')
        .setDescription('Depositar oro al banco')
        .addIntegerOption(o => o.setName('cantidad').setRequired(true)),
    new SlashCommandBuilder()
        .setName('retirar')
        .setDescription('Retirar oro del banco')
        .addIntegerOption(o => o.setName('cantidad').setRequired(true)),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
    );
})();

/* =============================
   EVENTO PRINCIPAL
============================= */

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const userId = interaction.user.id;

    /* PERFIL */
    if (interaction.commandName === 'perfil') {
        const jugador = await obtenerJugador(userId);

        await interaction.reply({
            embeds: [{
                title: `Perfil de ${interaction.user.username}`,
                color: 0x00ff99,
                fields: [
                    { name: "Nivel", value: jugador.nivel.toString(), inline: true },
                    { name: "XP", value: jugador.xp.toString(), inline: true },
                    { name: "Oro", value: jugador.oro.toString(), inline: true },
                    { name: "Banco", value: jugador.banco.toString(), inline: true }
                ]
            }]
        });
    }

    /* BALANCE */
    if (interaction.commandName === 'balance') {
        const jugador = await obtenerJugador(userId);
        await interaction.reply(`💰 Oro: ${jugador.oro}`);
    }

    /* TRABAJAR */
    if (interaction.commandName === 'trabajar') {
        const oro = Math.floor(Math.random() * 50) + 20;
        const xp = 20;

        await supabase.rpc('sumar_oro', { uid: userId, cantidad: oro });
        const nivel = await agregarXP(userId, xp);

        await interaction.reply(`Trabajaste y ganaste ${oro} oro y ${xp} XP.`);
    }

    /* LOOT */
    if (interaction.commandName === 'loot') {
        const { data: items } = await supabase.from('items').select('*');
        const random = items[Math.floor(Math.random() * items.length)];

        await supabase.from('inventario').insert({
            user_id: userId,
            item_id: random.id
        });

        await interaction.reply({
            embeds: [{
                title: `Encontraste ${random.nombre}`,
                description: random.efecto || "Sin efecto",
                color: colorRareza(random.rareza)
            }]
        });
    }

    /* BAG */
    if (interaction.commandName === 'bag') {
        const { data } = await supabase
            .from('inventario')
            .select('items(*)')
            .eq('user_id', userId);

        if (!data || data.length === 0)
            return interaction.reply("Tu inventario está vacío.");

        const lista = data.map(i => `• ${i.items.nombre}`).join("\n");

        await interaction.reply({
            embeds: [{
                title: "🎒 Inventario",
                description: lista
            }]
        });
    }

    /* EQUIPAR */
    if (interaction.commandName === 'equipar') {
        const id = interaction.options.getString('id');

        await supabase
            .from('players')
            .update({ arma_equipped: id })
            .eq('id', userId);

        await interaction.reply("Arma equipada correctamente.");
    }

    /* USAR */
    if (interaction.commandName === 'usar') {
        const id = interaction.options.getString('id');
        await interaction.reply("Item usado (sistema expandible).");
    }

    /* DEPOSITAR */
    if (interaction.commandName === 'depositar') {
        const cantidad = interaction.options.getInteger('cantidad');
        const jugador = await obtenerJugador(userId);

        if (jugador.oro < cantidad)
            return interaction.reply("No tienes suficiente oro.");

        await supabase
            .from('players')
            .update({
                oro: jugador.oro - cantidad,
                banco: jugador.banco + cantidad
            })
            .eq('id', userId);

        await interaction.reply(`Depositaste ${cantidad} oro.`);
    }

    /* RETIRAR */
    if (interaction.commandName === 'retirar') {
        const cantidad = interaction.options.getInteger('cantidad');
        const jugador = await obtenerJugador(userId);

        if (jugador.banco < cantidad)
            return interaction.reply("No tienes suficiente en el banco.");

        await supabase
            .from('players')
            .update({
                oro: jugador.oro + cantidad,
                banco: jugador.banco - cantidad
            })
            .eq('id', userId);

        await interaction.reply(`Retiraste ${cantidad} oro.`);
    }
});

client.login(TOKEN);
