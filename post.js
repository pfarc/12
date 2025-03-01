const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');

// Discord bot token ve kanal ID'sini buraya ekleyin

const CHANNEL_ID = '1315041250306424862';

// Discord istemcisi oluştur
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Bot hazır olduğunda çalışacak
client.once('ready', () => {
  console.log(`Bot giriş yaptı: ${client.user.tag}`);
  logFollowersData();
  // Her 45 dakikada bir çalıştırılan bir görev tanımla
  cron.schedule('*/45 * * * *', () => {
    logFollowersData();
  });
});

// JSON verilerini okuyup loglama fonksiyonu
function logFollowersData() {
  const filePath = './followers_data.json';
https://docs.google.com/spreadsheets/d/1roBOjQs1mepzjAq3ReY-WezpIpNTE6QSqvU2525ndSM/edit?gid=0#gid=0
  // Dosyayı oku ve JSON formatına çevir
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Dosya okuma hatası:', err);
      return;
    }

    try {
      const followersData = JSON.parse(data);
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında tarih al

      if (!followersData[currentDate]) {
        console.log('Bugün için veri bulunamadı.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('Takipçi Verileri')
        .setDescription(`📅 **Tarih:** ${currentDate}`)
        .setTimestamp();

      // Güncel tarih için kullanıcı verilerini embed'e ekle
      for (const [username, times] of Object.entries(followersData[currentDate])) {
        for (const [time, followers] of Object.entries(times)) {
          embed.addFields({
            name: `👤 ${username}`,
            value: `⏰ **Saat:** ${time}\n👥 **Takipçi Sayısı:** ${followers}`,
            inline: false,
          });
        }
      }

      // Mesajı belirlenen kanala gönder
      const channel = client.channels.cache.get(CHANNEL_ID);
      if (channel) {
        channel.send({ embeds: [embed] });
      } else {
        console.error('Kanal bulunamadı.');
      }
    } catch (parseError) {
      console.error('JSON parse hatası:', parseError);
    }
  });
}


// Botu başlat
client.login(process.env.token);
