global.ReadableStream = require('stream').Readable;
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Token ve kanal ID'si

const channelId = '1262435074796945488';

// Roller ve özel emojiler
const roles = [
  { id: '1262532584894632060', name: 'Rias', emoji: '<:riasEmoji:1279054332565917696>' }, // Dış sunucudan emoji
  { id: '1264649544176767108', name: 'Akeno', emoji: '<:akenoEmoji:1279054290484330640>' },
  { id: '1264649546626240552', name: 'Astolpho', emoji: '<:astolphoEmoji:1279054441902768249>' },
  { id: '1263867827769708585', name: 'Madoka', emoji: '<:madokaEmoji:1279054093574471681>' },
  { id: '1264649540896690206', name: 'Tohru', emoji: '<:tohruEmoji:1279054502107811951>' },
  { id: '1263260817927831584', name: 'Rem', emoji: '<:remEmoji:1279054475688017941>' },
  { id: '1263867831288729642', name: 'Fubuki', emoji: '<:fubukiEmoji:1279054049072906282>' },
  { id: '1337459403921559673', name: 'Mita', emoji: '<:mitaEmoji:1337459843308716174>' },
  { id: '1264650457238999120', name: '02', emoji: '<:zeroTwoEmoji:1279054362877890580>' },
  { id: '1264649767393296394', name: 'Makima', emoji: '<:makimaEmoji:1279054146451935333>' },
  { id: '1264649602879979520', name: 'Mai', emoji: '<:maiEmoji:1279054192723628126>' },
  { id: '1264650001372414075', name: 'Miku', emoji: '<:mikuEmoji:1279054408868429854>' },
  { id: '1267570655524556891', name: 'Rei', emoji: '<:reiEmoji:1279051536319778837>' },
  { id: '1267570963306909838', name: 'Tatsumaki', emoji: '<:tatsumakiEmoji:1279050918356324502>' },
  { id: '1267570841533812847', name: 'Subaru', emoji: '<:subaruEmoji:1279052291554672785>' },
  { id: '1274054064648228864', name: 'Madara', emoji: '<:madaraEmoji:1281926273521684510>' },
  { id: '1267570904330928178', name: 'Bocchi', emoji: '<:bocchiEmoji:1279049151132471296>' },
  { id: '1267569840382672999', name: 'Aizen', emoji: '<:aizenEmoji:1279051501502988338>' },
];

const redRoles = [
  { id: '1262392038327062598', name: 'Booster 1', emoji: '<:booster1Emoji:1279051212502859879>' }, // Dış sunucudan emoji
  { id: '1262435264119308370', name: 'Booster 2', emoji: '<:booster2Emoji:1279051300293840906>' },
  { id: '1262435237464506369', name: 'Booster 3', emoji: '<:booster3Emoji:1279051338973708308>' },
  { id: '1262435393559597148', name: 'Booster 4', emoji: '<:booster6Emoji:1280508145302503487>' },
  { id: '1262435436190761010', name: 'Booster 5', emoji: '<:booster5Emoji:1279051463045156884>' },
];

const requiredRoleId = '1083859074002727053'; // Gerekli rolün ID'si

// Botu oluştur ve ayarları yap
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', async () => {
  console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);

  const channel = await client.channels.fetch(channelId);
  if (!channel) return console.error('Kanal bulunamadı!');

  const messages = await channel.messages.fetch({ limit: 100 });
  const existingMessage = messages.find(msg => msg.author.id === client.user.id && msg.components.length > 0);

  if (!existingMessage) {
    const rows = [];

    // Normal butonlar
    for (let i = 0; i < roles.length; i += 5) {
      const buttons = roles.slice(i, i + 5).map(role => 
        new ButtonBuilder()
          .setCustomId(`role_button_${role.id}`)
          .setLabel(role.name)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(role.emoji) // Emoji ekliyoruz
      );
      rows.push(new ActionRowBuilder().addComponents(buttons));
    }

    // Kırmızı butonlar
    const redButtons = redRoles.map(role => 
      new ButtonBuilder()
        .setCustomId(`red_role_button_${role.id}`)
        .setLabel(role.name)
        .setStyle(ButtonStyle.Danger)
        .setEmoji(role.emoji) // Emoji ekliyoruz
    );
    rows.push(new ActionRowBuilder().addComponents(redButtons));

    await channel.send({ content: 'Booster rollerinizi seçin:', components: rows });
  } else {
    console.log('Daha önce gönderilmiş buton mesajı bulundu, yeni mesaj göndermiyorum.');
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const customIdPrefix = 'role_button_';
  const redCustomIdPrefix = 'red_role_button_';

  let roleId;
  if (interaction.customId.startsWith(customIdPrefix)) {
    roleId = interaction.customId.replace(customIdPrefix, '');
  } else if (interaction.customId.startsWith(redCustomIdPrefix)) {
    roleId = interaction.customId.replace(redCustomIdPrefix, '');
  } else {
    return;
  }

  const member = interaction.member;

  if (!member.roles.cache.has(requiredRoleId)) {
    await interaction.reply({ content: 'Üzgünüm, sunucuya boost basmanız gerekiyor.', ephemeral: true });
    return;
  }

  const memberRoles = member.roles.cache.filter(role => roles.some(r => r.id === role.id) || redRoles.some(r => r.id === role.id));

  try {
    await member.roles.remove(memberRoles);
    await member.roles.add(roleId);

    await interaction.reply({ content: `Yeni rolünüz: <@&${roleId}>`, ephemeral: true });
  } catch (error) {
    console.error('Rol yönetim hatası:', error);
    await interaction.reply({ content: 'Bir hata oluştu, lütfen tekrar deneyin.', ephemeral: true });
  }
});

// Botu başlat
client.login(process.env.TOKEN)
