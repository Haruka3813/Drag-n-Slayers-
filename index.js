const {
Client,
GatewayIntentBits,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
REST,
Routes,
SlashCommandBuilder
} = require("discord.js")

const fs=require("fs")

const TOKEN=process.env.TOKEN
const CLIENT_ID=process.env.CLIENT_ID

if(!TOKEN||!CLIENT_ID){
 console.log("Faltan variables TOKEN o CLIENT_ID")
 process.exit(1)
}

const client=new Client({
 intents:[GatewayIntentBits.Guilds]
})

//////////////////////////////////////////////////
// BASE DE DATOS
//////////////////////////////////////////////////

let players={}

if(fs.existsSync("./players.json")){
 players=JSON.parse(fs.readFileSync("./players.json"))
}

function save(){
 fs.writeFileSync("./players.json",JSON.stringify(players,null,2))
}

function getPlayer(id){

 if(!players[id]){

  players[id]={

   level:1,
   xp:0,

   coins:100,
   bank:0,

   class:null,

   inventory:{},

   weapon:null,
   armor:null,

   pets:[],
   activePet:null

  }

 }

 return players[id]
}

//////////////////////////////////////////////////
// ITEMS
//////////////////////////////////////////////////

const items={

1:{id:1,name:"Madera",price:5,type:"material"},
2:{id:2,name:"Hierro",price:10,type:"material"},
3:{id:3,name:"Oro",price:20,type:"material"},
4:{id:4,name:"Diamante",price:50,type:"material"},

100:{id:100,name:"Poción",price:30,type:"consumable",heal:25},

200:{id:200,name:"Espada hierro",price:120,type:"weapon",damage:15},
201:{id:201,name:"Espada fuego",price:300,type:"weapon",damage:25},

300:{id:300,name:"Armadura hierro",price:200,type:"armor",defense:10}

}

//////////////////////////////////////////////////
// RECETAS
//////////////////////////////////////////////////

const recipes={
200:{2:4,1:2},
300:{2:6,1:2}
}

//////////////////////////////////////////////////
// MASCOTAS
//////////////////////////////////////////////////

const pets={

1:{name:"Lobo",bonus:"damage"},
2:{name:"Halcón",bonus:"xp"},
3:{name:"Dragón bebé",bonus:"loot"}

}

//////////////////////////////////////////////////
// ENEMIGOS
//////////////////////////////////////////////////

const enemies={

slime:{
 name:"Slime",
 xp:10,
 coins:15,
 loot:[1,100]
},

goblin:{
 name:"Goblin",
 xp:20,
 coins:30,
 loot:[2]
},

dragon:{
 name:"Dragón Antiguo",
 xp:200,
 coins:500,
 loot:[4,201,300]
}

}

//////////////////////////////////////////////////
// BUSCAR ITEM
//////////////////////////////////////////////////

function findItem(q){

 if(!isNaN(q)) return items[q]

 q=q.toLowerCase()

 for(const id in items){
  if(items[id].name.toLowerCase()==q) return items[id]
 }

 return null
}

//////////////////////////////////////////////////
// LEVEL UP
//////////////////////////////////////////////////

function levelUp(player){

 const need=player.level*100

 if(player.xp>=need){
  player.level++
  player.xp=0
  return true
 }

 return false
}

//////////////////////////////////////////////////
// INVENTARIO PAGINADO
//////////////////////////////////////////////////

function inventoryPages(player){

 const ids=Object.keys(player.inventory)

 const pages=[]

 for(let i=0;i<ids.length;i+=5){

  const slice=ids.slice(i,i+5)

  let text=""

  slice.forEach(id=>{
   text+=`🆔${id} ${items[id].name} x${player.inventory[id]}\n`
  })

  pages.push(text)

 }

 if(pages.length==0) pages.push("Inventario vacío")

 return pages
}

//////////////////////////////////////////////////
// MINAR
//////////////////////////////////////////////////

function mine(player){

 const loot=[1,2,3]

 const id=loot[Math.floor(Math.random()*loot.length)]

 player.inventory[id]=(player.inventory[id]||0)+1

 player.xp+=5

 return items[id].name
}

//////////////////////////////////////////////////
// PESCAR
//////////////////////////////////////////////////

function fish(player){

 const loot=[1,100]

 const id=loot[Math.floor(Math.random()*loot.length)]

 player.inventory[id]=(player.inventory[id]||0)+1

 return items[id].name
}

//////////////////////////////////////////////////
// COMBATIR
//////////////////////////////////////////////////

function fight(player){

 const names=Object.keys(enemies)

 const enemy=enemies[names[Math.floor(Math.random()*names.length)]]

 player.xp+=enemy.xp
 player.coins+=enemy.coins

 const drop=enemy.loot[Math.floor(Math.random()*enemy.loot.length)]

 player.inventory[drop]=(player.inventory[drop]||0)+1

 return{enemy,drop}
}

//////////////////////////////////////////////////
// FORJAR
//////////////////////////////////////////////////

function forge(player,id){

 const recipe=recipes[id]

 if(!recipe) return "No existe receta"

 for(const mat in recipe){

  if(!player.inventory[mat]||player.inventory[mat]<recipe[mat]){
   return "No tienes materiales"
  }

 }

 for(const mat in recipe){
  player.inventory[mat]-=recipe[mat]
 }

 player.inventory[id]=(player.inventory[id]||0)+1

 return`Forjaste ${items[id].name}`
}

//////////////////////////////////////////////////
// RANKING
//////////////////////////////////////////////////

function ranking(){

 const arr=Object.entries(players)

 arr.sort((a,b)=>b[1].level-a[1].level)

 return arr.slice(0,10)
}

//////////////////////////////////////////////////
// COMANDOS
//////////////////////////////////////////////////

const commands=[

new SlashCommandBuilder().setName("start").setDescription("Crear personaje"),

new SlashCommandBuilder().setName("profile").setDescription("Perfil"),

new SlashCommandBuilder().setName("bag").setDescription("Inventario"),

new SlashCommandBuilder().setName("mine").setDescription("Minar"),

new SlashCommandBuilder().setName("fish").setDescription("Pescar"),

new SlashCommandBuilder().setName("fight").setDescription("Pelear"),

new SlashCommandBuilder().setName("boss").setDescription("Boss"),

new SlashCommandBuilder().setName("shop").setDescription("Ver tienda"),

new SlashCommandBuilder()
.setName("buy")
.setDescription("Comprar")
.addStringOption(o=>o.setName("item").setRequired(true))
.addIntegerOption(o=>o.setName("cantidad").setRequired(true)),

new SlashCommandBuilder()
.setName("sell")
.setDescription("Vender")
.addStringOption(o=>o.setName("item").setRequired(true))
.addIntegerOption(o=>o.setName("cantidad").setRequired(true)),

new SlashCommandBuilder()
.setName("equip")
.setDescription("Equipar")
.addStringOption(o=>o.setName("item").setRequired(true)),

new SlashCommandBuilder()
.setName("forge")
.setDescription("Forjar")
.addStringOption(o=>o.setName("item").setRequired(true)),

new SlashCommandBuilder()
.setName("deposit")
.setDescription("Depositar")
.addIntegerOption(o=>o.setName("amount").setRequired(true)),

new SlashCommandBuilder()
.setName("withdraw")
.setDescription("Retirar")
.addIntegerOption(o=>o.setName("amount").setRequired(true)),

new SlashCommandBuilder().setName("ranking").setDescription("Ranking"),

new SlashCommandBuilder().setName("pets").setDescription("Ver mascotas"),

new SlashCommandBuilder()
.setName("petbuy")
.setDescription("Comprar mascota")
.addIntegerOption(o=>o.setName("id").setRequired(true)),

new SlashCommandBuilder()
.setName("petequip")
.setDescription("Equipar mascota")
.addIntegerOption(o=>o.setName("id").setRequired(true))

].map(c=>c.toJSON())

//////////////////////////////////////////////////
// REGISTRAR SLASH
//////////////////////////////////////////////////

async function register(){

 const rest=new REST({version:"10"}).setToken(TOKEN)

 await rest.put(
  Routes.applicationCommands(CLIENT_ID),
  {body:commands}
 )

 console.log("Slash commands listos")

}

//////////////////////////////////////////////////
// READY
//////////////////////////////////////////////////

client.once("ready",async()=>{

 console.log("Bot listo")

 await register()

})

//////////////////////////////////////////////////
// INTERACCIONES
//////////////////////////////////////////////////

client.on("interactionCreate",async interaction=>{

if(!interaction.isChatInputCommand())return

const player=getPlayer(interaction.user.id)
const cmd=interaction.commandName

//////////////////////////////////////////////////
// START
//////////////////////////////////////////////////

if(cmd=="start"){

 if(player.class){
  interaction.reply("Ya tienes personaje")
  return
 }

 player.class="fuego"

 save()

 interaction.reply("Personaje creado")

}

//////////////////////////////////////////////////
// PROFILE
//////////////////////////////////////////////////

if(cmd=="profile"){

 const embed=new EmbedBuilder()
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
// INVENTARIO
//////////////////////////////////////////////////

if(cmd=="bag"){

 const pages=inventoryPages(player)

 let page=0

 const embed=new EmbedBuilder()
 .setTitle("Inventario")
 .setDescription(pages[0])

 const row=new ActionRowBuilder().addComponents(
 new ButtonBuilder().setCustomId("prev").setLabel("⬅").setStyle(ButtonStyle.Primary),
 new ButtonBuilder().setCustomId("next").setLabel("➡").setStyle(ButtonStyle.Primary)
 )

 const msg=await interaction.reply({embeds:[embed],components:[row],fetchReply:true})

 const collector=msg.createMessageComponentCollector({time:60000})

 collector.on("collect",i=>{

 if(i.customId=="next")page++
 if(i.customId=="prev")page--

 if(page<0)page=0
 if(page>=pages.length)page=pages.length-1

 embed.setDescription(pages[page])

 i.update({embeds:[embed]})

 })

}

//////////////////////////////////////////////////
// MINE
//////////////////////////////////////////////////

if(cmd=="mine"){

 const item=mine(player)

 if(levelUp(player)){
  interaction.channel.send("Subiste nivel")
 }

 save()

 interaction.reply("Minaste "+item)

}

//////////////////////////////////////////////////
// FISH
//////////////////////////////////////////////////

if(cmd=="fish"){

 const item=fish(player)

 save()

 interaction.reply("Pescaste "+item)

}

//////////////////////////////////////////////////
// FIGHT
//////////////////////////////////////////////////

if(cmd=="fight"){

 const result=fight(player)

 if(levelUp(player)){
  interaction.channel.send("Subiste nivel")
 }

 save()

 interaction.reply(`Peleaste contra ${result.enemy.name}
XP +${result.enemy.xp}
Coins +${result.enemy.coins}
Loot ${items[result.drop].name}`)

}

//////////////////////////////////////////////////
// BOSS
//////////////////////////////////////////////////

if(cmd=="boss"){

 const boss=enemies.dragon

 player.xp+=boss.xp
 player.coins+=boss.coins

 const drop=boss.loot[Math.floor(Math.random()*boss.loot.length)]

 player.inventory[drop]=(player.inventory[drop]||0)+1

 save()

 interaction.reply(`Derrotaste ${boss.name}
Loot ${items[drop].name}`)

}

//////////////////////////////////////////////////
// SHOP
//////////////////////////////////////////////////

if(cmd=="shop"){

 let text="TIENDA\n\n"

 for(const id in items){
  const it=items[id]
  text+=`🆔${id} ${it.name} - ${it.price} coins\n`
 }

 interaction.reply(text)

}

//////////////////////////////////////////////////
// BUY
//////////////////////////////////////////////////

if(cmd=="buy"){

 const name=interaction.options.getString("item")
 const amount=interaction.options.getInteger("cantidad")

 const item=findItem(name)

 const price=item.price*amount

 if(player.coins<price){
  interaction.reply("No tienes dinero")
  return
 }

 player.coins-=price
 player.inventory[item.id]=(player.inventory[item.id]||0)+amount

 save()

 interaction.reply("Compraste "+amount+" "+item.name)

}

//////////////////////////////////////////////////
// SELL
//////////////////////////////////////////////////

if(cmd=="sell"){

 const name=interaction.options.getString("item")
 const amount=interaction.options.getInteger("cantidad")

 const item=findItem(name)

 if(!player.inventory[item.id]||player.inventory[item.id]<amount){
  interaction.reply("No tienes ese item")
  return
 }

 player.inventory[item.id]-=amount

 const price=Math.floor(item.price/2)*amount

 player.coins+=price

 save()

 interaction.reply("Vendiste "+amount+" "+item.name)

}

//////////////////////////////////////////////////
// EQUIP
//////////////////////////////////////////////////

if(cmd=="equip"){

 const name=interaction.options.getString("item")

 const item=findItem(name)

 if(item.type=="weapon")player.weapon=item.id
 if(item.type=="armor")player.armor=item.id

 save()

 interaction.reply("Equipaste "+item.name)

}

//////////////////////////////////////////////////
// FORGE
//////////////////////////////////////////////////

if(cmd=="forge"){

 const name=interaction.options.getString("item")

 const item=findItem(name)

 const result=forge(player,item.id)

 save()

 interaction.reply(result)

}

//////////////////////////////////////////////////
// PETS
//////////////////////////////////////////////////

if(cmd=="pets"){

 let text="Mascotas\n\n"

 for(const id in pets){
  text+=`🆔${id} ${pets[id].name}\n`
 }

 interaction.reply(text)

}

//////////////////////////////////////////////////
// PETBUY
//////////////////////////////////////////////////

if(cmd=="petbuy"){

 const id=interaction.options.getInteger("id")

 const price=500

 if(player.coins<price){
  interaction.reply("No tienes dinero")
  return
 }

 player.coins-=price
 player.pets.push(id)

 save()

 interaction.reply("Compraste "+pets[id].name)

}

//////////////////////////////////////////////////
// PETEQUIP
//////////////////////////////////////////////////

if(cmd=="petequip"){

 const id=interaction.options.getInteger("id")

 if(!player.pets.includes(id)){
  interaction.reply("No tienes esa mascota")
  return
 }

 player.activePet=id

 save()

 interaction.reply("Mascota equipada "+pets[id].name)

}

//////////////////////////////////////////////////
// BANCO
//////////////////////////////////////////////////

if(cmd=="deposit"){

 const amount=interaction.options.getInteger("amount")

 if(player.coins<amount){
  interaction.reply("No tienes dinero")
  return
 }

 player.coins-=amount
 player.bank+=amount

 save()

 interaction.reply("Depositaste "+amount)

}

if(cmd=="withdraw"){

 const amount=interaction.options.getInteger("amount")

 if(player.bank<amount){
  interaction.reply("No tienes dinero en banco")
  return
 }

 player.bank-=amount
 player.coins+=amount

 save()

 interaction.reply("Retiraste "+amount)

}

//////////////////////////////////////////////////
// RANKING
//////////////////////////////////////////////////

if(cmd=="ranking"){

 const top=ranking()

 let text="Ranking\n\n"

 top.forEach((p,i)=>{
  text+=`${i+1}. Nivel ${p[1].level}\n`
 })

 interaction.reply(text)

}

})

client.login(TOKEN)
