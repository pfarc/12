const { EmbedBuilder } = require('discord.js');

const requiredRoleId = '1257806701784993882'; // Belirli bir rolün ID'si

function generateRandomNumber() {
  return Math.floor(100000 + Math.random() * 900000); // 6 haneli rastgele sayı üretir
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function nukeCommand(interaction) {
  const userRoles = interaction.member.roles.cache;
  
  // Kullanıcının belirli bir role sahip olup olmadığını kontrol edin
  if (!userRoles.has(requiredRoleId)) {
    const embed = new EmbedBuilder()
      .setTitle('Yetki Yok')
      .setDescription('Sadece gecenin şanslıları kullanabilir ⭐')
      .setColor('#FF0000');
    
    await interaction.reply({ embeds: [embed], ephemeral: false }); // ephemeral: false ile mesajı herkese görünür yapın
    return;
  }

  const numbers = Array(10).fill().map(() => generateRandomNumber());
  const username = interaction.user.username; // Kullanıcının adını alın

  const embed = new EmbedBuilder()
    .setTitle('N6 KOMUTU AKTİFLEŞTİ')
    .setDescription('patlamak üzere...')
    .setColor('#FF0000')
    .setFooter({ text: `aktifleştiren kişi: ${username}` }); // Kullanıcı adını embed'e ekleyin

  const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

  for (let i = 0; i < numbers.length; i++) {
    embed.setDescription(`🎰 ${numbers[i]} 🎰`);
    await msg.edit({ embeds: [embed] });
    await delay(500); // Efekt için gecikme süresi, ihtiyacınıza göre ayarlayabilirsiniz
  }

  const finalNumber = generateRandomNumber();
  embed.setDescription(`💥 ${finalNumber} 💥`)
    .setColor('#00FF00');
  await msg.edit({ embeds: [embed] });

  return finalNumber;
}

module.exports = {
  nukeCommand
};
