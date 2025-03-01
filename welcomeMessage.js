const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = (member, welcomeChannelId) => {
  const cooldownTime = 5 * 60 * 1000; // 5 dakika
  const now = Date.now();
  const userId = member.id;
  const cooldowns = new Map();

  if (cooldowns.has(userId) && (now - cooldowns.get(userId)) < cooldownTime) {
    return;
  }

  cooldowns.set(userId, now);

  let images;
  try {
    const data = fs.readFileSync(path.resolve(__dirname, 'links.json'), 'utf8');
    images = JSON.parse(data);
  } catch (error) {
    console.error('Error reading links.json file:', error);
    images = [];
  }

  const randomImage = images[Math.floor(Math.random() * images.length)];

const welcomeEmbed = new EmbedBuilder()
  .setColor('#0099ff')
  .setTitle("Hoş geldin! <a:Yuppi:1134653397421801604>")
  .setDescription(`Hoşgeldin ${member}!\nLütfen kurallar kanalını gözden geçirdiğinizden emin olun.\n<#1083853598716346450>`)
  .setThumbnail(member.user.displayAvatarURL())
  .setImage(randomImage)
  .setTimestamp()
  .setFooter({ text: `🎉 Seninle birlikte ${member.guild.memberCount} kişi olduk! | ${member.user.tag} ❤️` });

  const channel = member.guild.channels.cache.get(welcomeChannelId);
  if (channel) {
    channel.send({ embeds: [welcomeEmbed] });
  }
};
