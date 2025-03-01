global.ReadableStream = require('stream').Readable;
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const cron = require('cron');
const fs = require('fs');
const GUILD_ID = '1083853598020096051'; 
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
});

const DISCORD_CLOSED_DATE = new Date('2024-10-09T02:10:00'); // Discord'un kapalı olduğu tarih ve saat

// Zaman farkını hesaplayan fonksiyon
function calculateUptime() {
  const now = new Date();
  const diff = now - DISCORD_CLOSED_DATE;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${days} gün, ${hours} saat, ${minutes} dakika, ${seconds} saniye`;
}

// Rastgele mesaj fonksiyonu
function sendRandomMessage(channel) {
  const randomDelay = Math.floor(Math.random() * (21600000 - 3600000)) + 3600000;
  // 10-60 dakika arasında rastgele süre

  setTimeout(() => {
    const uptime = calculateUptime(); // Uptime'ı hesapla
    channel.send(`${uptime} Oldu Sizi bekliyorum!`); // Uptime'ı mesajda kullan
    sendRandomMessage(channel); // Mesajı gönderdikten sonra tekrar beklemeye başla
  }, randomDelay);
}

// Bot komutları
client.on('messageCreate', (message) => {
  if (message.content === '!discord') {
    const uptime = calculateUptime();

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('Discord Kapalı')
      .addFields({ name: 'Geçen Süre', value: uptime })
      .setTimestamp()
      .setFooter({ text: 'Discord Durumu' });

    message.channel.send({ embeds: [embed] });
  }
});

// MP3 dosyasını ses kanalında oynatma
async function playAudioInVoiceChannel(channelId, mp3Url) {
  const channel = client.channels.cache.get(channelId);

  // Kanalın var olup olmadığını ve ses kanalı olup olmadığını kontrol edin
  if (!channel || channel.type !== 2) { // GUILD_VOICE kanalı tipi 2 olarak belirtiliyor
    console.error('Geçersiz ses kanalı IDsi.');
    return;
  }

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
  });

  const player = createAudioPlayer();

  function playLoop() {
    const resource = createAudioResource(mp3Url); // URL'yi doğrudan kullan
    player.play(resource);
  }

  player.on(AudioPlayerStatus.Idle, () => {
    playLoop(); // MP3 dosyasını tekrar başlat (loop)
  });

  connection.subscribe(player);
  playLoop(); // İlk MP3 dosyasını çalma
}

// Bot giriş yaptığında
client.once('ready', () => {
  console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);

  // Mesaj göndermek istediğiniz kanalın ID'sini girin
  const textChannel = client.channels.cache.get('1257805256910307328'); // 'KANAL_ID' yerine kanalın gerçek ID'sini girin
  if (textChannel) {
    sendRandomMessage(textChannel); // Rastgele mesaj gönderimi başlasın
  }

  // Ses kanalında MP3 oynatma işlemi başlat (7/24 loop)
  const voiceChannelId = '1258040107525738569'; // Buraya ses kanalının gerçek ID'sini girin
  const mp3Path = 'https://cdn.glitch.global/e2263050-6e98-4ecc-97cf-e421eec93243/Roi.mp3?v=1728477100392'; // Buraya MP3 dosyanızın gerçek yolunu girin
  playAudioInVoiceChannel(voiceChannelId, mp3Path);
});
client.once('ready', () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
    updateMemberCount(); // İlk açılışta durum güncellenir.
});

client.on('guildMemberAdd', () => {
    updateMemberCount(); // Yeni üye geldiğinde durum güncellenir.
});

client.on('guildMemberRemove', () => {
    updateMemberCount(); // Üye çıktığında durum güncellenir.
});

async function updateMemberCount() {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return console.error('Sunucu bulunamadı!');

    try {
        const memberCount = guild.memberCount; // Sunucudaki toplam üye sayısını alır.
        client.user.setActivity(`${memberCount} üye var!`, { type: ActivityType.Watching }); // Durumu ayarlar.
        console.log(`Durum güncellendi: ${memberCount} üye var!`);
    } catch (error) {
        console.error('Durum güncellenirken bir hata oluştu:', error);
    }
}
// Bot'u başlat
client.login(process.env.token2);
