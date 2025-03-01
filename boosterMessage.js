const { EmbedBuilder } = require('discord.js');

module.exports = (oldMember, newMember) => {
  // Boost rolü ve kanal ID'lerini tanımlayın
  const boostRoleId = '1083859074002727053'; // Booster rolünün ID'si
  const boostChannelId = '1257805256910307328'; // Boost mesajı göndermek istediğiniz kanalın ID'si
  const specialRoleChannelId = '1262435074796945488'; // Boosterlara özel rollerin verildiği kanalın ID'si

  // Eski ve yeni rollerin cache'lerini alın
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  // Kullanıcının boost yapıp yapmadığını kontrol edin
  const userBoosted = !oldRoles.has(boostRoleId) && newRoles.has(boostRoleId);

  if (userBoosted) {
    const boostChannel = newMember.guild.channels.cache.get(boostChannelId);
    if (boostChannel) {
      // Boost mesajı için embed oluşturun
      const boostEmbed = new EmbedBuilder()
        .setColor('#ff73fa')
        .setTitle('🎉 Sunucu Boostlandı! 🎉')
        .setDescription(
          `**${newMember}**, sunucumuzu boostladı! 🥳\n\n` +
          `Sunucumuza destek olduğun için teşekkürler!\n\n` +
          `🎁 **Boosterlara özel roller** almak için <#${specialRoleChannelId}> kanalına göz atmayı unutma!`
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({
          text: 'Boost için teşekkürler!',
          iconURL: newMember.user.displayAvatarURL()
        });

      // Boost kanalına embed gönderin
      boostChannel.send({ embeds: [boostEmbed] });
    }
  }
};
