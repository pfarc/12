const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const cron = require('node-cron');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Bot ayarları
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });  
const CHANNEL_ID = '1330718595323269201'; // Kelime oyunlarının oynanacağı kanalın ID'si
const SCORE_FILE = 'scores.json';
const LAST_QUESTION_FILE = 'lastQuestion.json';

// Skorları yükle veya yeni bir skor dosyası oluştur
let scores = {};
if (fs.existsSync(SCORE_FILE)) {
    scores = JSON.parse(fs.readFileSync(SCORE_FILE));
} else {
    fs.writeFileSync(SCORE_FILE, JSON.stringify(scores));
}

// Önceki soru mesajını silmek için fonksiyon
async function deleteLastQuestion(channel) {
    if (fs.existsSync(LAST_QUESTION_FILE)) {
        const lastQuestionData = JSON.parse(fs.readFileSync(LAST_QUESTION_FILE));
        try {
            const lastMessage = await channel.messages.fetch(lastQuestionData.messageId);
            await lastMessage.delete();
        } catch (error) {
            console.log('Önceki soru mesajı silinemedi veya bulunamadı:', error.message);
        }
    }
}

// Rastgele kelime almak için ücretsiz bir API kullan
async function getRandomWord() {
    const response = await fetch('https://random-word-api.herokuapp.com/word');
    const data = await response.json();
    return data[0];
}

// Kelimenin Türkçe çevirisini almak için API kullan
async function translateWord(word) {
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${word}&langpair=en|tr`);
    const data = await response.json();
    return data.responseData.translatedText;
}

// Rastgele yanlış çeviriler üret
async function getRandomWrongTranslations(correctTranslation, count = 3) {
    const wrongTranslations = new Set();

    while (wrongTranslations.size < count) {
        const randomWord = await getRandomWord();
        const randomTranslation = await translateWord(randomWord);

        // Yanlış çevirinin doğru cevaba eşit olmadığından emin ol
        if (randomTranslation !== correctTranslation && !wrongTranslations.has(randomTranslation)) {
            wrongTranslations.add(randomTranslation);
        }
    }

    return Array.from(wrongTranslations);
}

// Sıralama embedini oluştur
function createLeaderboardEmbed() {
    const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const description = sortedScores.map(([user, score], index) => `**${index + 1}. ${user}:** ${score} puan`).join('\n');

    return new EmbedBuilder()
        .setTitle('Günlük Kelime Oyunu Sıralaması')
        .setDescription(description || 'Henüz kimse puan kazanmadı.')
        .setColor(0x00AE86);
}

// Sıralama tablosunu güncelle
async function updateLeaderboard(channel) {
    const leaderboardEmbed = createLeaderboardEmbed();
    await channel.send({ embeds: [leaderboardEmbed] });
}

// Oyunu başlat
async function startDailyGame(channel) {
    await deleteLastQuestion(channel); // Önceki soruyu sil

    const randomWord = await getRandomWord();
    const correctTranslation = await translateWord(randomWord);
    const wrongTranslations = await getRandomWrongTranslations(correctTranslation);

    const allTranslations = [correctTranslation, ...wrongTranslations].sort(() => Math.random() - 0.5);

    const embed = new EmbedBuilder()
        .setTitle('Kelime Oyunu')
        .setDescription(`İngilizce kelime: **${randomWord}**\n\nSeçenekler:
        1️⃣ ${allTranslations[0]}
        2️⃣ ${allTranslations[1]}
        3️⃣ ${allTranslations[2]}
        4️⃣ ${allTranslations[3]}`)
        .setColor(0xFFD700);

    const message = await channel.send({ embeds: [embed] });

    // Yeni mesaj ID'sini kaydet
    fs.writeFileSync(LAST_QUESTION_FILE, JSON.stringify({ messageId: message.id }));

    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    for (const emoji of emojis) {
        await message.react(emoji);
    }

    const filter = (reaction, user) => emojis.includes(reaction.emoji.name) && !user.bot;
    const collector = message.createReactionCollector({ filter, time: 60000 });

    collector.on('collect', (reaction, user) => {
        const selectedIndex = emojis.indexOf(reaction.emoji.name);
        if (allTranslations[selectedIndex] === correctTranslation) {
            if (!scores[user.username]) scores[user.username] = 0;
            scores[user.username] += 1;
            fs.writeFileSync(SCORE_FILE, JSON.stringify(scores));
            channel.send(`✅ **${user.username}**, doğru cevabı buldun!`);
        } else {
            channel.send(`❌ **${user.username}**, yanlış cevap verdin.`);
        }
    });

    collector.on('end', async () => {
        await updateLeaderboard(channel);
    });
}

client.once('ready', async () => {
    console.log('Bot çalışıyor!');
    const channel = await client.channels.fetch(CHANNEL_ID);

    // Her 30 saniyede oyunu başlat
    cron.schedule('*/30 * * * * *', () => {
        startDailyGame(channel);
    });
});

client.login(process.env.TOKEN);
