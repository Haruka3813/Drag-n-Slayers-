const { 
Client,
GatewayIntentBits,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js")

const fs = require("fs")

const client = new Client({
 intents:[GatewayIntentBits.Guilds]
})

const TOKEN = "MTQ3MzI5Njc0OTE5NTE2NTg0OA.Gtf_rg.EmbkjaY_XCx877NQDLCyjtENi4S-uZJrxtWyuk"

//////////////////////////////////////////////////
//// BASE DE DATOS
//////////////////////////////////////////////////

let players = {}

if(fs.existsSync("./players.json")){
 players = JSON.parse(fs.readFileSync("./players.json"))
}

function save(){
 fs.writeFileSync("./players.json",JSON.stringify(players,null,2))
}

function getPlayer(id){

 if(!players[id]){

  players[id] = {

   level:1,
   xp:0,

   coins:100,
   bank:0,

   class:null,

   hp:100,

   inventory:{},

   weapon:null,
   armor:null,

   pets:[],
   activePet:null,

   achievements:{},

   quests:{
    mine:0,
    fight:0
   }

  }

 }

 return players[id]
}

//////////////////////////////////////////////////
//// ITEMS
//////////////////////////////////////////////////

const items = {

1:{id:1,name:"Madera",type:"material",price:5},

2:{id:2,name:"Hierro",type:"material",price:10},

3:{id:3,name:"Oro",type:"material",price:20},

4:{id:4,name:"Diamante",type:"material",price:50},

100:{id:100,name:"Poción pequeña",type:"consumable",heal:25,price:30},

200:{id:200,name:"Espada hierro",type:"weapon",damage:15,price:120},

201:{id:201,name:"Espada fuego",type:"weapon",damage:25,price:300},

300:{id:300,name:"Armadura hierro",type:"armor",defense:10,price:200}

}

//////////////////////////////////////////////////
//// RECETAS
//////////////////////////////////////////////////

const recipes = {

200:{
 materials:{2:4,1:2}
},

300:{
 materials:{2:6,1:2}
}

}

//////////////////////////////////////////////////
//// ENEMIGOS
//////////////////////////////////////////////////

const enemies = {

slime:{
 name:"Slime",
 hp:30,
 damage:5,
 xp:10,
 coins:15,
 loot:[1,100]
},

goblin:{
 name:"Goblin",
 hp:60,
 damage:10,
 xp:20,
 coins:30,
 loot:[2,200]
},

dragon:{
 name:"Dragón Antiguo",
 hp:500,
 damage:60,
 xp:200,
 coins:500,
 loot:[4,201,300]
}

}

//////////////////////////////////////////////////
//// CLASES
//////////////////////////////////////////////////

const classes = {

fuego:{damage:1.2},

aire:{xp:1.15},

oscuridad:{crit:1.25},

metal:{defense:1.3},

hielo:{freeze:0.2},

rayo:{speed:1.2}

}

//////////////////////////////////////////////////
//// HABILIDADES
//////////////////////////////////////////////////

const skills = {

fuego:{name:"Llamarada",damage:35},

aire:{name:"Tormenta de viento",damage:25},

oscuridad:{name:"Abyss",damage:40},

metal:{name:"Golpe de acero",damage:30},

hielo:{name:"Congelar",damage:20},

rayo:{name:"Relámpago",damage:35}

}

//////////////////////////////////////////////////
//// MASCOTAS
//////////////////////////////////////////////////

const pets = {

1:{name:"Lobo",bonus:"damage"},

2:{name:"Halcón",bonus:"xp"},

3:{name:"Dragón bebé",bonus:"loot"}

}

//////////////////////////////////////////////////
//// BUSCAR ITEM
//////////////////////////////////////////////////

function findItem(query){

 if(!isNaN(query)) return items[query]

 query = query.toLowerCase()

 for(const id in items){
  if(items[id].name.toLowerCase() === query){
   return items[id]
  }
 }

 return null
}

//////////////////////////////////////////////////
//// LEVEL UP
//////////////////////////////////////////////////

function levelUp(player){

 const need = player.level*100

 if(player.xp>=need){

  player.level++
  player.xp=0

  return true

 }

 return false
}

//////////////////////////////////////////////////
//// INVENTARIO PAGINAS
//////////////////////////////////////////////////

function inventoryPages(player){

 const ids = Object.keys(player.inventory)

 const pages=[]

 for(let i=0;i<ids.length;i+=5){

  const slice=ids.slice(i,i+5)

  let text=""

  slice.forEach(id=>{
   text+=`🆔${id} ${items[id].name} x${player.inventory[id]}\n`
  })

  pages.push(text)

 }

 if(pages.length===0) pages.push("Inventario vacío")

 return pages
}

//////////////////////////////////////////////////
//// MINAR
//////////////////////////////////////////////////

function mine(player){

 const loot=[1,2,3]

 const id = loot[Math.floor(Math.random()*loot.length)]

 player.inventory[id]=(player.inventory[id]||0)+1

 player.quests.mine++

 return items[id].name
}

//////////////////////////////////////////////////
//// PESCAR
//////////////////////////////////////////////////

function fish(player){

 const loot=[1,100]

 const id = loot[Math.floor(Math.random()*loot.length)]

 player.inventory[id]=(player.inventory[id]||0)+1

 return items[id].name
}

//////////////////////////////////////////////////
//// COMBATE
//////////////////////////////////////////////////

function fight(player){

 const names = Object.keys(enemies)

 const enemy = enemies[names[Math.floor(Math.random()*names.length)]]

 player.xp+=enemy.xp
 player.coins+=enemy.coins

 player.quests.fight++

 const drop = enemy.loot[Math.floor(Math.random()*enemy.loot.length)]

 player.inventory[drop]=(player.inventory[drop]||0)+1

 return {enemy,drop}
}

//////////////////////////////////////////////////
//// EXPLORAR
//////////////////////////////////////////////////

function explore(player){

 const events=["enemy","loot","coins"]

 const event = events[Math.floor(Math.random()*events.length)]

 if(event==="coins"){

  const amount = Math.floor(Math.random()*50)

  player.coins+=amount

  return `Encontraste ${amount} coins`

 }

 if(event==="loot"){

  const id=1+Math.floor(Math.random()*4)

  player.inventory[id]=(player.inventory[id]||0)+1

  return `Encontraste ${items[id].name}`

 }

 if(event==="enemy"){

  const result = fight(player)

  return `Te atacó ${result.enemy.name}`

 }

}

//////////////////////////////////////////////////
//// RANKING
//////////////////////////////////////////////////

function ranking(){

 const arr = Object.entries(players)

 arr.sort((a,b)=>b[1].level-a[1].level)

 return arr.slice(0,10)

}

//////////////////////////////////////////////////
//// EVENTOS
//////////////////////////////////////////////////

client.on("interactionCreate", async interaction=>{

if(!interaction.isChatInputCommand()) return

const player = getPlayer(interaction.user.id)

const cmd = interaction.commandName

//////////////////////////////////////////////////
//// START
//////////////////////////////////////////////////

if(cmd==="start"){

 if(player.class){
 interaction.reply("Ya tienes personaje")
 return
 }

 player.class="fuego"

 save()

 interaction.reply("🐉 Personaje creado")

}

//////////////////////////////////////////////////
//// PROFILE
//////////////////////////////////////////////////

if(cmd==="profile"){

 const embed = new EmbedBuilder()

 .setTitle(interaction.user.username)

 .addFields(

 {name:"Clase",value:String(player.class)},

 {name:"Nivel",value:String(player.level)},

 {name:"XP",value:String(player.xp)},

 {name:"Coins",value:String(player.coins)},

 {name:"Banco",value:String(player.bank)}

 )

 interaction.reply({embeds:[embed]})

}

//////////////////////////////////////////////////
//// BAG
//////////////////////////////////////////////////

if(cmd==="bag"){

 const pages = inventoryPages(player)

 let page=0

 const embed = new EmbedBuilder()

 .setTitle("Inventario")

 .setDescription(pages[0])

 const row = new ActionRowBuilder().addComponents(

 new ButtonBuilder()

 .setCustomId("prev")

 .setLabel("⬅")

 .setStyle(ButtonStyle.Primary),

 new ButtonBuilder()

 .setCustomId("next")

 .setLabel("➡")

 .setStyle(ButtonStyle.Primary)

 )

 const msg = await interaction.reply({

 embeds:[embed],

 components:[row],

 fetchReply:true

 })

 const collector = msg.createMessageComponentCollector({time:60000})

 collector.on("collect",i=>{

 if(i.customId==="next") page++

 if(i.customId==="prev") page--

 if(page<0) page=0

 if(page>=pages.length) page=pages.length-1

 embed.setDescription(pages[page])

 i.update({embeds:[embed]})

 })

}

//////////////////////////////////////////////////
//// MINE
//////////////////////////////////////////////////

if(cmd==="mine"){

 const item = mine(player)

 player.xp+=5

 if(levelUp(player)){

 interaction.channel.send("🎉 Subiste de nivel!")

 }

 save()

 interaction.reply(`⛏ Minaste ${item}`)

}

//////////////////////////////////////////////////
//// FISH
//////////////////////////////////////////////////

if(cmd==="fish"){

 const item = fish(player)

 save()

 interaction.reply(`🎣 Pescaste ${item}`)

}

//////////////////////////////////////////////////
//// FIGHT
//////////////////////////////////////////////////

if(cmd==="fight"){

 const result = fight(player)

 if(levelUp(player)){

 interaction.channel.send("🎉 Subiste de nivel!")

 }

 save()

 interaction.reply(

`⚔ Peleaste contra ${result.enemy.name}

XP +${result.enemy.xp}

Coins +${result.enemy.coins}

Loot: ${items[result.drop].name}`

 )

}

//////////////////////////////////////////////////
//// BOSS
//////////////////////////////////////////////////

if(cmd==="boss"){

 const boss = enemies.dragon

 player.xp+=boss.xp

 player.coins+=boss.coins

 const drop = boss.loot[Math.floor(Math.random()*boss.loot.length)]

 player.inventory[drop]=(player.inventory[drop]||0)+1

 save()

 interaction.reply(

`🐉 Derrotaste al ${boss.name}

XP +${boss.xp}

Coins +${boss.coins}

Loot: ${items[drop].name}`

 )

}

//////////////////////////////////////////////////
//// SKILL
//////////////////////////////////////////////////

if(cmd==="skill"){

 const skill = skills[player.class]

 interaction.reply(

`🔥 Usaste ${skill.name}

Daño ${skill.damage}`

 )

}

//////////////////////////////////////////////////
//// EXPLORE
//////////////////////////////////////////////////

if(cmd==="explore"){

 const text = explore(player)

 save()

 interaction.reply("🗺 "+text)

}

//////////////////////////////////////////////////
//// BALANCE
//////////////////////////////////////////////////

if(cmd==="balance"){

 interaction.reply(

`Coins: ${player.coins}

Banco: ${player.bank}`

 )

}

//////////////////////////////////////////////////
//// DEPOSIT
//////////////////////////////////////////////////

if(cmd==="deposit"){

 const amount = interaction.options.getInteger("amount")

 player.coins-=amount

 player.bank+=amount

 save()

 interaction.reply(`Depositaste ${amount}`)

}

//////////////////////////////////////////////////
//// WITHDRAW
//////////////////////////////////////////////////

if(cmd==="withdraw"){

 const amount = interaction.options.getInteger("amount")

 player.bank-=amount

 player.coins+=amount

 save()

 interaction.reply(`Retiraste ${amount}`)

}

//////////////////////////////////////////////////
//// EQUIP
//////////////////////////////////////////////////

if(cmd==="equip"){

 const itemName = interaction.options.getString("item")

 const item = findItem(itemName)

 if(item.type==="weapon") player.weapon=item.id

 if(item.type==="armor") player.armor=item.id

 save()

 interaction.reply(`Equipaste ${item.name}`)

}

//////////////////////////////////////////////////
//// RANKING
//////////////////////////////////////////////////

if(cmd==="ranking"){

 const top = ranking()

 let text="🏆 Ranking\n\n"

 top.forEach((p,i)=>{

 text+=`${i+1}. Nivel ${p[1].level}\n`

 })

 interaction.reply(text)

}

})

client.login(TOKEN)
