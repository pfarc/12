global.ReadableStream = require('stream').Readable;
const { Client, GatewayIntentBits, REST, Routes, Collection, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const boosterMessage = require('./boosterMessage');
const { nukeCommand } = require('./nuke');
const welcomeMessage = require('./welcomeMessage');
const setPresenceAndChannelName = require('./status');
const { handleBan, handleUnban } = require('./ban');
const { handleSaygiCommand, handleSkorCommand, handleMemberLeave, handleSaygiDuzenleCommand, handleSaygiBanCommand } = require('./saygi');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();
client.on('guildMemberRemove', async member => {
  await handleMemberLeave(member);
});

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!saygıban')) {
    await handleSaygiBanCommand(message);
  }
  // Diğer komutlarınızı buraya ekleyebilirsiniz.
});
client.commands.set('nuke', {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('6 haneli rastgele bir sayı üretir'),
  execute: nukeCommand,
});

// Register interaction commands

// Integrate saygi commands
client.commands.set('saygı', {
  data: new SlashCommandBuilder()
    .setName('saygı')
    .setDescription('Bir kullanıcıya saygı puanı verin')
    .addUserOption(option => option.setName('kullanıcı').setDescription('Saygı puanı vereceğiniz kullanıcı').setRequired(true)),
  execute: handleSaygiCommand,
});

client.commands.set('skor', {
  data: new SlashCommandBuilder()
    .setName('skor')
    .setDescription('Saygı puanı skor tablosunu gösterir'),
  execute: handleSkorCommand,
});

// Register the /saygıdüzenle command
client.commands.set('saygıdüzenle', {
  data: new SlashCommandBuilder()
    .setName('saygıdüzenle')
    .setDescription('Saygı puanı komutunda gösterilecek resmi düzenleyin.')
    .addStringOption(option => option.setName('url').setDescription('Yeni resim URL\'si').setRequired(true)),
  execute: handleSaygiDuzenleCommand,
});


const welcomeChannelId = '1257805256910307328';
const banChannelId = '1257805256910307328';
const unbanChannelId = '1257805256910307328';

// Bot giriş yaptıktan sonra çalışacak kodlar
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Modülü başlat
  setPresenceAndChannelName(client);
});
client.on('guildMemberAdd', member => {
  console.log(`Yeni üye katıldı: ${member.user.tag}`);
  welcomeMessage(member, welcomeChannelId);
});
client.on('guildBanAdd', ban => {
  console.log(`Kullanıcı yasaklandı: ${ban.user.tag}`);
  handleBan(ban, banChannelId);
});
client.on('guildMemberUpdate', (oldMember, newMember) => {
  console.log(`Üye güncellendi: ${newMember.user.tag}`);
  boosterMessage(oldMember, newMember);
});
client.on('guildBanRemove', unban => {
  console.log(`Kullanıcının yasağı kaldırıldı: ${unban.user.tag}`);
  handleUnban(unban, unbanChannelId);
});


client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Komut yürütülürken bir hata oluştu!', ephemeral: true });
    }
  }
});


client.login(process.env.TOKEN)
  .then(() => {
    console.log('Bot başarıyla giriş yaptı');
  })
  .catch(err => {
    console.error('Giriş hatası:', err);
  });

require('./boostdel.js');
require('./sans.js');
require('./zaman.js');
require('./uyari.js');
require('./renk.js');
require('./boosterol.js');
require('./anasv.js');
require('./msg.js');
require('./yedek.js');
require('./karantina.js');
require('./basn.js');