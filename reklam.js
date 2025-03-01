const { Client, GatewayIntentBits, ActionRowBuilder, Events, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.GuildMembers
 
 ]
});

const LINK_BUTTON_CHANNEL_ID = '1257805256910307328'; // Link button channel ID
const LOG_CHANNEL_ID = '1274401276716777594'; // Log channel ID
const memberDataFile = './memberData.json'; // File to store member data
const afkDataFile = './afk.json'; // File to store AFK data

let memberData = {
  joinCount: 0,
  leaveCount: 0,
  members: {}
};

let afkData = {};

// Load member data from file if it exists
if (fs.existsSync(memberDataFile)) {
  memberData = JSON.parse(fs.readFileSync(memberDataFile, 'utf8'));
}

// Load AFK data from file if it exists
if (fs.existsSync(afkDataFile)) {
  afkData = JSON.parse(fs.readFileSync(afkDataFile, 'utf8'));
}

client.once('ready', () => {
  console.log('Bot hazır!');

  // Schedule the embed and button message every 3 hours
cron.schedule('0 0 */2 * *', async () => {
    sendEmbedWithButtons();
});

  // Create /afk command
  client.application.commands.create(new SlashCommandBuilder()
    .setName('afk')
    .setDescription('AFK moduna geçer.')
    .addStringOption(option => 
      option.setName('sebep')
        .setDescription('AFK sebebinizi girin.')
        .setRequired(false))
  );
});

async function sendEmbedWithButtons() {
  const channel = await client.channels.fetch(LINK_BUTTON_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Mod başvurusu ve Tavsiyeler')
    .setDescription('Merhaba! 🎉 Sunucumuzu daha keyifli hale getirmek için tavsiyelerinizi duymak isteriz. Önerilerinizi paylaşarak sunucuyu hep birlikte daha iyi hale getirebiliriz! destek olanlara elit uye rolu 🎉 💬✨ Ayrıca, mod başvurularımız da açık! Eğer sunucumuza katkıda bulunmak isterseniz, başvurunuzu bekliyoruz. 🔥🚀')
    .setColor(0x3498db)
    .setTimestamp();

  const buttonRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Tavsiye')
        .setURL('https://forms.gle/hx3wA8nnRB45nov19')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Mod başvuru')
        .setURL('https://forms.gle/sc6ZbafGBM4fA1N17')
        .setStyle(ButtonStyle.Link)
    );

  await channel.send({ embeds: [embed], components: [buttonRow] });
}

// Event listener for new member joins
client.on('guildMemberAdd', async (member) => {
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
  if (!logChannel) return;

  const userId = member.id;
  let joinMessage = `Yeni bir üye sunucuya katıldı: ${member.user.tag} (${userId})`;

  // Check if the member has joined the server before
  if (memberData.members[userId]) {
    joinMessage += '\nBu üye daha önce sunucuya katılmış.';
  } else {
    memberData.members[userId] = { joined: true };
  }

  // Increment the join count
  memberData.joinCount += 1;

  // Save member data
  fs.writeFileSync(memberDataFile, JSON.stringify(memberData, null, 2), 'utf8');

  joinMessage += `\nToplam giriş sayısı: ${memberData.joinCount}`;

  logChannel.send(joinMessage);
});

// Event listener for members leaving
client.on('guildMemberRemove', async (member) => {
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
  if (!logChannel) return;

  const userId = member.id;
  const leaveMessage = `Bir üye sunucudan ayrıldı: ${member.user.tag} (${userId})`;

  // Increment the leave count
  memberData.leaveCount += 1;

  // Save member data
  fs.writeFileSync(memberDataFile, JSON.stringify(memberData, null, 2), 'utf8');

  logChannel.send(`${leaveMessage}\nToplam çıkış sayısı: ${memberData.leaveCount}`);
});

// Event listener for the /afk command
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'afk') {
    const reason = options.getString('sebep') || 'Sebep belirtilmedi';
    afkData[interaction.user.id] = { reason: reason, timestamp: Date.now() };

    // Save AFK data
    fs.writeFileSync(afkDataFile, JSON.stringify(afkData, null, 2), 'utf8');

    await interaction.reply({ content: `Artık AFK modundasınız: ${reason}`, ephemeral: true });
  }
});

// Event listener for message creation
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Check if the message mentions a user who is AFK
  message.mentions.users.forEach(user => {
    if (afkData[user.id]) {
      const reason = afkData[user.id].reason;
      const afkSince = afkData[user.id].timestamp;
      const afkDuration = Math.floor((Date.now() - afkSince) / 1000); // in seconds
      const afkTime = new Date(afkDuration * 1000).toISOString().substr(11, 8); // Format as HH:MM:SS
      message.reply(`${user.tag} şu anda AFK. Sebep: ${reason}. AFK süresi: ${afkTime}`);
    }
  });

  // Check if the user who sent a message is AFK and remove them from AFK mode
  if (afkData[message.author.id]) {
    delete afkData[message.author.id];

    // Save AFK data
    fs.writeFileSync(afkDataFile, JSON.stringify(afkData, null, 2), 'utf8');

    message.reply(`${message.author.tag}, AFK modundan çıktınız.`);
  }
});

const sesVerisiDosyasi = 'ses_verileri.json';

// Ses verilerini yükle
let sesVerileri = {};
if (fs.existsSync(sesVerisiDosyasi)) {
    sesVerileri = JSON.parse(fs.readFileSync(sesVerisiDosyasi, 'utf8'));
}

// Üyenin ses kanalına girdiği zamanı kaydet
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const uyeID = newState.id;

    if (newState.channel && !oldState.channel) {
        // Üye ses kanalına girdi
        if (!sesVerileri[uyeID]) {
            sesVerileri[uyeID] = { toplamSure: 0, girisZamani: null };
        }
        sesVerileri[uyeID].girisZamani = Date.now();
    } else if (!newState.channel && oldState.channel) {
        // Üye ses kanalından çıktı
        if (sesVerileri[uyeID] && sesVerileri[uyeID].girisZamani) {
            const gecenSure = Date.now() - sesVerileri[uyeID].girisZamani;
            sesVerileri[uyeID].toplamSure += gecenSure;
            sesVerileri[uyeID].girisZamani = null;
        }
    }

    // Verileri JSON dosyasına kaydet
    fs.writeFileSync(sesVerisiDosyasi, JSON.stringify(sesVerileri, null, 2));
});

client.login(process.env.TOKEN)
