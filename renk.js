const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ChannelType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

const boosterRoleId = '1083859074002727053'; // Sunucu booster rolünün ID'si

const colorRoles = [
  { label: 'Kırmızı', id: '1258458953956855860', boosterOnly: true },
  { label: 'Koyu Kırmızı', id: '1258458966388772867', boosterOnly: false },
  { label: 'Bordo', id: '1258458968838242446', boosterOnly: false },
  { label: 'Turuncu', id: '1258458957094191114', boosterOnly: false },
  { label: 'Altın', id: '1258458969412866058', boosterOnly: true },
  { label: 'Sarı', id: '1258458956167122995', boosterOnly: false },
  { label: 'Açık Limon', id: '1264889398697132086', boosterOnly: true },
  { label: 'Limon Yeşili', id: '1278734431682691093', boosterOnly: true },
  { label: 'Yeşil', id: '1258458954888122429', boosterOnly: false },
  { label: 'Zeytin Yeşili', id: '1258458967458185277', boosterOnly: false },
  { label: 'Açık Yeşil', id: '1258458964841070734', boosterOnly: true },
  { label: 'Camgöbeği', id: '1258458965466157068', boosterOnly: false },
  { label: 'Gökyüzü Mavisi', id: '1278734424208441395', boosterOnly: true },
  { label: 'Açık Mavi', id: '1258458963179995228', boosterOnly: true },
  { label: 'Mavi', id: '1258458955961733256', boosterOnly: false },
  { label: 'Lavanta', id: '1278734429602447452', boosterOnly: true },
  { label: 'Eflatun', id: '1258458963939168256', boosterOnly: true },
  { label: 'Pembe', id: '1258458958109343775', boosterOnly: false },
  { label: 'Parlak Pembe', id: '1278734419653558403', boosterOnly: true },
  { label: 'Açık Pembe', id: '1278734421532479550', boosterOnly: true },
  { label: 'Mor', id: '1258458957618352312', boosterOnly: false },
  { label: 'Kahverengi', id: '1258458958578847835', boosterOnly: false },
  { label: 'Gri', id: '1258458960269279264', boosterOnly: false },
  { label: 'Siyah', id: '1258458961586163804', boosterOnly: true },
  { label: 'Beyaz', id: '1258458962525819023', boosterOnly: false },
];

const channelId = '1258459563745869857'; // Butonların gönderileceği kanalın ID'si

client.once('ready', async () => {
  console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);

  const channel = await client.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    console.error('Kanal bulunamadı veya metin kanalı değil!');
    return;
  }

  const messages = await channel.messages.fetch({ limit: 100 });
  const botMessage = messages.find(msg => msg.author.id === client.user.id && msg.components.length > 0);

  if (!botMessage) {
    const normalRoleMentions = colorRoles.filter(role => !role.boosterOnly).map(role => `<@&${role.id}>`).join(' ');
    const boosterRoleMentions = colorRoles.filter(role => role.boosterOnly).map(role => `<@&${role.id}>`).join(' ');

    const embed = new EmbedBuilder()
      .setTitle('Renk Rolleri')
      .setColor(0x00AE86)
      .addFields(
        { name: 'Renk Rolleri', value: normalRoleMentions || 'Yok' },
        { name: 'Booster Rolleri', value: boosterRoleMentions || 'Yok' }
      );

    await channel.send({ embeds: [embed] });

    const options = colorRoles.map(role => ({
      label: role.label,
      value: role.id,
      description: role.boosterOnly ? 'Booster rolü gerektirir' : 'Herkes için',
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('color_select')
      .setPlaceholder('Bir renk seçin...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await channel.send({
      content: '-------------------------------------------------------------------------------',
      components: [row],
    });
  } else {
    console.log('Bot menüyü zaten bu kanala gönderdi.');
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId !== 'color_select') return;

  const roleId = interaction.values[0];
  const role = interaction.guild.roles.cache.get(roleId);
  const colorRole = colorRoles.find(r => r.id === roleId);
  const isBoosterOnly = colorRole ? colorRole.boosterOnly : false;

  if (!role) {
    if (!interaction.replied) {
      await interaction.reply({ content: 'Bu rol bulunamadı.', ephemeral: true });
    }
    return;
  }

  if (isBoosterOnly && !interaction.member.roles.cache.has(boosterRoleId)) {
    if (!interaction.replied) {
      await interaction.reply({ content: 'Bu rolü almak için sunucu booster olmalısınız.', ephemeral: true });
    }
    return;
  }

  const memberRoles = interaction.member.roles.cache;
  const colorRoleIds = colorRoles.map(r => r.id);

  try {
    for (const colorRoleId of colorRoleIds) {
      if (memberRoles.has(colorRoleId)) {
        await interaction.member.roles.remove(colorRoleId);
      }
    }

    await interaction.member.roles.add(role);
    if (!interaction.replied) {
      await interaction.reply({ content: `${role.name} rolü size verildi.`, ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    if (!interaction.replied) {
      await interaction.reply({ content: 'Rol verilirken bir hata oluştu.', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN)