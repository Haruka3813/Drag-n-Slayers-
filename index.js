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

/* ===============================
   IA PROGRESIVA
================================ */

function escalarEnemigo(nivelJugador) {
    return {
        vida: 80 + nivelJugador * 20,
        daño: 10 + nivelJugador * 5,
        recompensa: 50 + nivelJugador * 25
    };
}

/* ===============================
   FUNCIONES BASE
================================ */

async function obtenerJugador(userId) {
    let { data } = await supabase.from('players').select('*').eq('id', userId).single();

    if (!data) {
        const nuevo = {
            id: userId,
            nivel: 1,
            xp: 0,
            oro: 100,
            banco: 0,
            arma_equipped: null,
            mascota_activa: null,
            rango: "Novato",
            vida: 100
        };

        await supabase.from('players').insert(nuevo);
        return nuevo;
    }

    return data;
}

async function agregarXP(userId, cantidad) {
    let j = await obtenerJugador(userId);
    let xp = j.xp + cantidad;
    let nivel = j.nivel;

    while (xp >= XP_POR_NIVEL) {
        xp -= XP_POR_NIVEL;
        nivel++;
    }

    await supabase.from('players')
        .update({ xp, nivel })
        .eq('id', userId);
}

/* ===============================
   COMANDOS
================================ */

const commands = [

    new SlashCommandBuilder().setName('perfil').setDescription('Ver perfil'),

    new SlashCommandBuilder().setName('combatir').setDescription('Pelear PvE'),

    new SlashCommandBuilder()
        .setName('pvp')
        .setDescription('Pelear contra jugador')
        .addUserOption(o => o.setName('rival').setRequired(true)),

    new SlashCommandBuilder()
        .setName('mazmorra')
        .setDescription('Entrar a mazmorra cooperativa'),

    new SlashCommandBuilder()
        .setName('vender')
        .setDescription('Vender item en mercado')
        .addStringOption(o => o.setName('item_id').setRequired(true))
        .addIntegerOption(o => o.setName('precio').setRequired(true)),

    new SlashCommandBuilder()
        .setName('comprar')
        .setDescription('Comprar del mercado')
        .addStringOption(o => o.setName('id').setRequired(true)),

    new SlashCommandBuilder().setName('ranking').setDescription('Top jugadores'),

    new SlashCommandBuilder().setName('tienda').setDescription('Ver tienda global')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
})();

/* ===============================
   EVENTOS
================================ */

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;

    /* PERFIL */
    if (interaction.commandName === 'perfil') {
        const j = await obtenerJugador(userId);
        return interaction.reply(
            `Nivel: ${j.nivel}\nOro: ${j.oro}\nVida: ${j.vida}`
        );
    }

    /* PVE IA PROGRESIVA */
    if (interaction.commandName === 'combatir') {
        const j = await obtenerJugador(userId);
        const enemigo = escalarEnemigo(j.nivel);

        await supabase.rpc('sumar_oro', { uid: userId, cantidad: enemigo.recompensa });
        await agregarXP(userId, 40);

        return interaction.reply(
            `Derrotaste enemigo escalado!\nGanaste ${enemigo.recompensa} oro`
        );
    }

    /* PVP REAL */
    if (interaction.commandName === 'pvp') {
        const rival = interaction.options.getUser('rival');
        const j1 = await obtenerJugador(userId);
        const j2 = await obtenerJugador(rival.id);

        const poder1 = j1.nivel * 10;
        const poder2 = j2.nivel * 10;

        const ganador = poder1 >= poder2 ? userId : rival.id;

        await supabase.rpc('sumar_oro', { uid: ganador, cantidad: 100 });

        return interaction.reply(
            `Ganador: <@${ganador}>`
        );
    }

    /* MAZMORRA COOP */
    if (interaction.commandName === 'mazmorra') {
        const j = await obtenerJugador(userId);

        const vidaBoss = 300 + j.nivel * 30;
        const recompensa = 500 + j.nivel * 50;

        await supabase.rpc('sumar_oro', { uid: userId, cantidad: recompensa });
        await agregarXP(userId, 100);

        return interaction.reply(
            `Mazmorra completada!\nGanaste ${recompensa} oro`
        );
    }

    /* MERCADO */
    if (interaction.commandName === 'vender') {
        const itemId = interaction.options.getString('item_id');
        const precio = interaction.options.getInteger('precio');

        await supabase.from('mercado').insert({
            vendedor: userId,
            item_id: itemId,
            precio
        });

        return interaction.reply("Item puesto en mercado.");
    }

    if (interaction.commandName === 'comprar') {
        const id = interaction.options.getString('id');

        const { data } = await supabase.from('mercado')
            .select('*')
            .eq('id', id)
            .single();

        if (!data) return interaction.reply("No existe.");

        await supabase.rpc('sumar_oro', { uid: data.vendedor, cantidad: data.precio });

        await supabase.from('mercado').delete().eq('id', id);

        return interaction.reply("Compra realizada.");
    }

    /* RANKING */
    if (interaction.commandName === 'ranking') {
        const { data } = await supabase
            .from('players')
            .select('*')
            .order('nivel', { ascending: false })
            .limit(10);

        const top = data.map((p, i) => `${i + 1}. <@${p.id}> - Nivel ${p.nivel}`).join("\n");

        return interaction.reply(top);
    }

    /* TIENDA GLOBAL */
    if (interaction.commandName === 'tienda') {
        const { data } = await supabase.from('items').select('*').limit(10);

        const lista = data.map(i => `${i.nombre} - ${i.rareza}`).join("\n");

        return interaction.reply(lista);
    }

});

client.login(TOKEN);
