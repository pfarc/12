const { EmbedBuilder } = require('discord.js');

module.exports = {
  handleBan: (ban, banChannelId) => {
    const { user, guild } = ban;
    const banChannel = guild.channels.cache.get(banChannelId);

    if (!banChannel) {
      console.error(`Ban channel with ID ${banChannelId} not found`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Kullanıcı Banlandı🛫')
      .setDescription(`**${user.tag}** sunucudan banlandı, o artık **eşşek** cennetinde.`)
      .setColor('#FF0000')
      .setTimestamp()
      .setImage('https://media.discordapp.net/attachments/1128963757100519424/1147994201624166450/ezgif-2-f673a2e530.gif?ex=66865faa&is=66850e2a&hm=123c58f55809fc463cee6f13b70352332b2ff983b8f48ec1f4bc4ca7450b6f22&='); // Embed'e gif ekleyin

    banChannel.send({ embeds: [embed] });
  },

  handleUnban: (unban, unbanChannelId) => {
    const { user, guild } = unban;
    const unbanChannel = guild.channels.cache.get(unbanChannelId);

    if (!unbanChannel) {
      console.error(`Unban channel with ID ${unbanChannelId} not found`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Kullanıcının Banı Açıldı')
      .setDescription(`**${user.tag}** sunucudan banı açıldı.`)
      .setColor('#00FF00')
      .setTimestamp()
      .setImage('https://media.discordapp.net/attachments/1128963757100519424/1147994201267642408/ezgif-2-e432a73d09.gif?ex=66865faa&is=66850e2a&hm=ceb4e1ee5b20f606d432215aab8e1ebb20e6001e79c2005ec1d68cf09671078d&='); // Embed'e gif ekleyin

    unbanChannel.send({ embeds: [embed] });
  }
};
