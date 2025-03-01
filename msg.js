const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const path = require('path');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
const repliedUsers = new Map();
const REPLY_TIMEOUT = 60 * 60 * 1000; // 1 saatlik zaman aşımı (milisaniye cinsinden)

const LOG_CHANNEL_ID = '1269285404524155002';  // Log kanalı ID'si
const EMOJI_CHANNEL_ID = '1257805256910307328';  // Emoji kanalı ID'si
const MESSAGE_CHECK_CHANNEL_ID = '1257805256910307328'; // Mesaj kontrol kanalı ID'si
const RANDOM_MESSAGE_CHANNEL_ID = '1257805256910307328'; // Rastgele mesaj kanalı ID'si
const MESSAGE_COUNT_FILE = 'messageCounts.json'; // Mesaj sayılarının tutulduğu dosya
const MESSAGES_FILE = 'messages.json'; // Mesaj örneklerinin bulunduğu dosya
const KAMICASH_FILE = 'kamicash.json'; // Üye mesaj sayılarının tutulduğu dosya

let hourlyMessageCount = 0; // Saatlik mesaj sayısını tutmak için değişken
let lastMessageTime = Date.now(); // Son mesajın zamanını tutmak için

let messageCache = []; // Mesajları geçici olarak tutmak için

client.once('ready', () => {
  console.log('Bot hazır!');

  // Mesaj sayısını tutan dosya yoksa oluştur
  if (!fs.existsSync(MESSAGE_COUNT_FILE)) {
    fs.writeFileSync(MESSAGE_COUNT_FILE, JSON.stringify({}));
  }

  // Üye mesaj sayısını tutan dosya yoksa oluştur
  if (!fs.existsSync(KAMICASH_FILE)) {
    fs.writeFileSync(KAMICASH_FILE, JSON.stringify({}));
  }

  // Her 15 dakikada bir kanal ismini güncelle
  cron.schedule('*/15 * * * *', async () => {
    updateChannelName();
  });

  // Her saat başı mesaj sayısını logla
  cron.schedule('0 * * * *', async () => {
    logHourlyMessageCount();
  });

  // Her gün sonunda toplam mesaj sayısını logla
  cron.schedule('59 23 * * *', async () => {
    logDailyMessageCount();
  });

  // Her 3 saatte bir rastgele emoji gönder
  cron.schedule('0 */1 * * *', async () => {
    sendRandomEmoji();
  });

  // Her 5 dakikada bir kontrol et (30 dakika boyunca mesaj gelmemişse)
  cron.schedule('*/5 * * * *', async () => {
    checkForInactivity();
  });

  // Rastgele mesajları belirli aralıklarla gönder
  scheduleRandomMessage();
});

let unwantedUsers;
try {
  unwantedUsers = JSON.parse(fs.readFileSync('istenmeyen.json', 'utf-8'));
} catch (err) {
  console.error('Error loading unwanted users file:', err);
  unwantedUsers = [];
}

client.on('messageCreate', message => {
  if (message.author.bot) return; // Ignore bot messages

  // Ignore messages from unwanted users
  if (unwantedUsers.includes(message.author.id)) return;

  // If any of the keywords are present in the message, react with a random emoji
  const keywords = ['kamibot', 'kami', 'kami-bot'];
  if (keywords.some(keyword => message.content.toLowerCase().includes(keyword))) {
    const emojis = client.emojis.cache;
    if (emojis.size > 0) {
      const randomEmoji = emojis.random(); // Choose a random emoji
      message.react(randomEmoji);
    }
  }

  // Saatlik mesaj sayısını artır
  hourlyMessageCount++;

  // Günlük mesaj sayısını güncelle
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
  const data = JSON.parse(fs.readFileSync(MESSAGE_COUNT_FILE, 'utf8'));
  if (!data[date]) {
    data[date] = 0;
  }
  data[date]++;

  // Güncellenen mesaj sayısını dosyaya kaydet
  fs.writeFileSync(MESSAGE_COUNT_FILE, JSON.stringify(data));

  // Üye mesaj sayısını güncelle
  const kamicashData = JSON.parse(fs.readFileSync(KAMICASH_FILE, 'utf8'));
  const userId = message.author.id;

  if (!kamicashData[userId]) {
    kamicashData[userId] = 0;
  }
  kamicashData[userId]++;

  // Güncellenen üye mesaj sayısını dosyaya kaydet
  fs.writeFileSync(KAMICASH_FILE, JSON.stringify(kamicashData));

  // Son mesaj zamanını güncelle
  if (message.channel.id === MESSAGE_CHECK_CHANNEL_ID) {
    lastMessageTime = Date.now();
  }

  // Mesajı cache'e ekle
  messageCache.push({ author: message.author.id, content: message.content, timestamp: Date.now() });

  // Aynı anda aynı mesajı yazan iki üye kontrolü
  const similarMessages = messageCache.filter(msg => msg.content === message.content && msg.timestamp > Date.now() - 10000); // Son 10 saniye

  if (similarMessages.length >= 2 && similarMessages.some(msg => msg.author !== message.author.id)) {
    if (message.content) {
      message.channel.send(message.content);
    } else {
      console.error('Detected similar messages but content is empty, not sending.');
    }
    messageCache = []; // Cache'i sıfırla
  }
});

async function checkForInactivity() {
  const currentTime = Date.now();
  const thirtyMinutes = 200 * 60 * 1000;

  if (currentTime - lastMessageTime >= thirtyMinutes) {
    const channel = await client.channels.fetch(MESSAGE_CHECK_CHANNEL_ID);
    if (channel) {
      const data = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      const messages = data.messages;
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      if (randomMessage) {
        channel.send(randomMessage);
      } else {
        console.error('Random message is empty, not sending.');
      }
    }
  }
}

async function sendRandomEmoji() {
  const channel = await client.channels.fetch(EMOJI_CHANNEL_ID);
  if (channel) {
    const emojis = client.emojis.cache;
    if (emojis.size > 0) {
      const randomEmoji = emojis.random(); // Rastgele bir emoji seç
      if (randomEmoji) {
        channel.send(`${randomEmoji}`);
      } else {
        console.error('Random emoji is empty, not sending.');
      }
    } else {
      channel.send('Sunucuda kullanılabilir emoji bulunamadı.');
    }
  }
}

async function logHourlyMessageCount() {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID);
  if (channel) {
    channel.send(`Saatlik mesaj sayısı: ${hourlyMessageCount}`);
  }
  hourlyMessageCount = 0; // Saatlik mesaj sayısını sıfırla
}

async function logDailyMessageCount() {
  const data = JSON.parse(fs.readFileSync(MESSAGE_COUNT_FILE, 'utf8'));

  const date = new Date();
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD formatı

  const messageCount = data[dateString] || 0;

  const channel = await client.channels.fetch(LOG_CHANNEL_ID);
  if (channel) {
    channel.send(`Günlük toplam mesaj sayısı: ${messageCount}`);
  }
}

async function updateChannelName() {
  const data = JSON.parse(fs.readFileSync(MESSAGE_COUNT_FILE, 'utf8'));

  let totalMessageCount = 0;
  for (const count of Object.values(data)) {
    totalMessageCount += count;
  }

  const channel = await client.channels.fetch(LOG_CHANNEL_ID);
  if (channel) {
    channel.setName(`Toplam Mesaj Sayısı: ${totalMessageCount}`);
  }
}

function scheduleRandomMessage() {
  // 3 ile 9 saat arası rastgele bir zaman aralığı
const randomInterval = Math.floor(Math.random() * (2 - 1) + 1) * 60 * 60 * 1000;


  setTimeout(async () => {
    const data = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    const randomMessages = data.randomMessages;
    const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];

    const channel = await client.channels.fetch(RANDOM_MESSAGE_CHANNEL_ID);
    if (channel) {
      if (randomMessage) {
        const emojis = client.emojis.cache;
        const randomEmoji = emojis.size > 0 ? emojis.random() : '';
        channel.send(`${randomMessage} ${randomEmoji}`);
      } else {
        console.error('Random message is empty, not sending.');
      }
    }

    // Yeni rastgele bir zaman aralığı belirleyerek tekrar başlat
    scheduleRandomMessage();
  }, randomInterval);
}
const USER_DATA_FILE = 'userData.json'; // En son mesaj tarihleri ve bildirim durumları dosyası
const INACTIVITY_CHANNEL_ID = '1083853598716346454'; // Etiketleme yapılacak kanalın ID'si

client.once('ready', () => {
  // Ensure the JSON file exists
  if (!fs.existsSync(USER_DATA_FILE)) {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify({}));
  }
  
  // Schedule to check inactivity every day
  cron.schedule('*/5 * * * *', async () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour < 23) { // Check if current time is between 9 AM and 11 PM
      checkForInactiveMembers();
    }
  });
});


client.on('messageCreate', message => {
  if (message.author.bot) return; // Bot mesajlarını yok say

  const userId = message.author.id;
  const currentDate = new Date().toISOString();
  
  // Update the last message date and reset inactivity notification
  const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
  
  if (!userData[userId]) {
    userData[userId] = { lastMessageDate: currentDate, notified: false };
  } else {
    userData[userId].lastMessageDate = currentDate;
    userData[userId].notified = false;
  }
  
  fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData));
});

async function checkForInactiveMembers() {
  const userData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf8'));
  const currentTime = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const channel = await client.channels.fetch(INACTIVITY_CHANNEL_ID);
  if (!channel) return;

  for (const userId in userData) {
    const lastMessageDate = new Date(userData[userId].lastMessageDate).getTime();

    // Check if the user is still in the guild
    const guild = channel.guild;
    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) {
      // User is no longer in the server, skip them
      continue;
    }

    if (currentTime - lastMessageDate >= sevenDays && !userData[userId].notified) {
      // Read the messages.json file
      const data = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      const inactiveMessages = data.inactiveMessages;
      const randomMessage = inactiveMessages[Math.floor(Math.random() * inactiveMessages.length)];
      
      // Fetch a random emoji
      const emojis = client.emojis.cache;
      const randomEmoji = emojis.size > 0 ? emojis.random() : '';

      // Send the notification message with a random emoji
      await channel.send(`<@${userId}> ${randomMessage} ${randomEmoji}`);

      // Mark the user as notified
      userData[userId].notified = true;
      fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData));
    }
  }
}
const BLACKLIST_FILE = path.join(__dirname, 'black.json');
const KARALISTE_FILE = path.join(__dirname, 'karaliste.txt');
const BLACK_CHANNEL_ID = '1274401276716777594'; // Log kanalının ID'sini buraya ekleyin

// Karalisteyi txt dosyasından oku ve bir dizi olarak döndür
function loadKeywords() {
  try {
    const data = fs.readFileSync(KARALISTE_FILE, 'utf8');
    return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  } catch (error) {
    console.error('Karaliste dosyası okunamadı:', error);
    return [];
  }
}

// Kullanıcının karalisteye dahil kelime sayısını güncelle ve log kanalına bildir
function updateBlacklistCount(userId, message, keyword) {
  let data = {};

  try {
    data = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
  } catch (error) {
    console.error('Black.json dosyası okunamadı:', error);
  }

  if (!data[userId]) {
    data[userId] = { count: 0 };
  }
  data[userId].count++;

  // Güncellenen sayıyı dosyaya kaydet
  fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(data, null, 2));

  // Log kanalına bildirim gönder
  const logChannel = message.guild.channels.cache.get(BLACK_CHANNEL_ID);
  if (logChannel) {
    const currentTime = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    logChannel.send(`\`${message.author.tag}\` adlı kullanıcı, \`${message.channel.name}\` kanalında karaliste kelimesi olan \`${keyword}\` kelimesini kullandı. Kullanıcı ID: \`${userId}\`, Saat: \`${currentTime}\`.`);
  }
}

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const keywords = loadKeywords();
  const messageContent = message.content.toLowerCase();

  keywords.forEach((keyword) => {
    // Kelimenin başında ve sonunda boşluk veya metin sınırı arayın
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(messageContent)) {
      updateBlacklistCount(message.author.id, message, keyword);
    }
  });
});
client.on('messageCreate', message => {
  if (message.author.bot) return; // Bot mesajlarını yok say

  // "korku" belirten kelimeleri içeren mesajları kontrol et
  const korkuKelimeleri = ['korku', 'korktum', 'korkuyorum', 'korkutucu', 'ürktüm', 'ürperdim'];
  const userId = message.author.id;

  if (korkuKelimeleri.some(kelime => message.content.toLowerCase().includes(kelime))) {
    const lastReplied = repliedUsers.get(userId);

    if (!lastReplied || (Date.now() - lastReplied) > REPLY_TIMEOUT) {
      const data = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      const korkuMessages = data.korku;
      const randomMessage = korkuMessages[Math.floor(Math.random() * korkuMessages.length)];

      const emojis = client.emojis.cache;
      const randomEmoji = emojis.size > 0 ? emojis.random() : '';

      message.reply(`${randomMessage} ${randomEmoji}`);
      repliedUsers.set(userId, Date.now());
    }
  }
});
const responses = ['Evet', 'Hayır', 'Bilmem'];

client.on('messageCreate', message => {
  // Botun kendisine cevap vermesini engelle
  if (message.author.bot) return;

  // Birleşik ya da ayrı yazılmış 'mıyım', 'miyim', 'muyum' eklerini kontrol et
  const regex = /\b\w*(mıyım|miyim|muyum|müm|miyim|mıy)\b/i;

  // Eğer mesaj bu ekleri içeriyorsa
  if (regex.test(message.content)) {
    // Rastgele bir cevap seç
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    message.reply(randomResponse);
  }
});

const REQUIRED_JSON_FILES = [
  'messageCounts.json',
  'kamicash.json',
  'userData.json',
  'messages.json',
  'black.json',
  'istenmeyen.json'
];

function checkJsonFiles() {
  try {
    REQUIRED_JSON_FILES.forEach(file => {
      const filePath = path.join(__dirname, file);

      // Eğer dosya yoksa oluştur
      if (!fs.existsSync(filePath)) {
        console.error(`Hata: ${file} dosyası bulunamadı!`);
        process.exit(1); // Botu kapat
      }

      // JSON dosyasını oku ve geçerli olup olmadığını kontrol et
      const data = fs.readFileSync(filePath, 'utf8');
      JSON.parse(data);
    });

    console.log('Tüm JSON dosyaları sağlıklı!');
  } catch (error) {
    console.error('JSON dosyaları bozuk veya okunamıyor:', error);
    process.exit(1); // Botu kapat
  }
}

// Bot başlamadan önce JSON dosyalarını kontrol et
checkJsonFiles();

client.once('ready', () => {
  console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
});

client.login(process.env.TOKEN)
	
