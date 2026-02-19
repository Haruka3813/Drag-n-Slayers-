
    await interaction.reply({ embeds: [embed] });
  }

  // --- COMANDO: /ayuda ---
  if (commandName === 'ayuda') {
    const embed = new EmbedBuilder()
      .setTitle("📚 AYUDA DEL BOT FAIRY TAIL")
      .setColor(0xF1C40F)
      .addFields(
        { name: "🪪 PERSONAJE", value: "/elegirmagia → Crear personaje\n/info_personaje → Ver perfil", inline: false },
        { name: "🎁 RECOMPENSAS", value: "/betatester → Recompensas beta\n/miau → Mascota UR inicial", inline: false },
        { name: "🐾 MASCOTAS", value: "/equipar_mascota → Equipar mascota\n/info_mascota → Ver stats", inline: false },
        { name: "🔜 PRÓXIMAMENTE", value: "/batallar_enemigo → Batallas NPC\n/tienda → Comprar ítems\n/aventura → Modo aventura", inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  }
});

// Iniciar el bot con el token de la variable de entorno
client.login(process.env.TOKEN).catch(error => {
  console.error(`❌ Error al iniciar el bot: ${error.message}`);
  console.log("💡 Verifica que el token en Render sea correcto");
});
