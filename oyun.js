const { Client, Events, GatewayIntentBits, Partials, ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require('discord.js');

require('dotenv').config();
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});



// Start checking the server status every 10 minutes

const unwantedUsers = JSON.parse(fs.readFileSync('istenmeyen.json', 'utf-8'));

// Selamlamalar ve diğer ayarları yükleme
const greetingsData = JSON.parse(fs.readFileSync('responses.json', 'utf-8'));

// Cooldown ayarları
const userCooldowns = {};
const COOLDOWN_DURATION = 30 * 1000; // 30 saniye cooldown

// Selamlamaları tespit etme ve rastgele bir yanıt alma işlevi
function detectAndRespond(message) {
    const content = message.content.toLowerCase();

    for (const greeting in greetingsData) {
        const { keywords, responses } = greetingsData[greeting];
        for (const keyword of keywords) {
            if (content.includes(keyword)) {
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                return randomResponse;
            }
        }
    }
    return null;
}

// Sunucudan rastgele bir emoji alma işlevi
function getRandomEmoji(guild) {
    const emojis = guild.emojis.cache;
    if (emojis.size > 0) {
        const randomEmoji = emojis.random();
        return randomEmoji ? randomEmoji.toString() : "";
    }
    return "";
}

client.once(Events.ClientReady, () => {
    console.log(`Bot is online as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return; // Bot mesajlarını görmezden gel

    // İstenmeyen üye kontrolü
    if (unwantedUsers.includes(message.author.id)) {
        return; // Kullanıcı istenmeyenler listesindeyse cevap verme
    }

    const userId = message.author.id;
    const currentTime = Date.now();

    // Kullanıcının cooldown süresinde olup olmadığını kontrol et
    if (userCooldowns[userId] && currentTime - userCooldowns[userId] < COOLDOWN_DURATION) {
        return; // Kullanıcı cooldown süresindeyse mesajı görmezden gel
    }

    const reply = detectAndRespond(message);
    if (reply) {
        const randomEmoji = getRandomEmoji(message.guild); // Sunucudan rastgele bir emoji al
        try {
            await message.channel.send(`${reply} ${randomEmoji}`);
            userCooldowns[userId] = currentTime; // Kullanıcı için son yanıt zamanını güncelle
        } catch (error) {
            console.error(`Mesaj gönderilemedi: ${error}`);
        }
    }
});
client.once('ready', () => {
    console.log(`Bot giriş yaptı: ${client.user.tag}`);

    // Context menu komutu oluşturma
    client.guilds.cache.forEach(guild => {
        guild.commands.create(
            new ContextMenuCommandBuilder()
                .setName('Etkileşim Yasakla')
                .setType(ApplicationCommandType.User)
        );
    });
});

// Etkileşim dinleme


client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});


const messages = [
    "Artık seninle konuşmak istemiyorum, sadece merak etmiştim.",
    "Sadece sana biraz ilgi göstermiştim, ama şimdi gerek yok.",
    "Seninle daha fazla konuşmanın bir anlamı yok, ne düşündüğümü zaten biliyorsun.",
    "Biraz ilgi istemiştim, ama sanırım yanlış yerden istedim.",
    "Seninle konuşmak eğlenceliydi, ama artık bitirmek istiyorum.",
    "Sadece seninle biraz zaman geçirmek istemiştim, ama şimdi istemiyorum.",
    "Bu konuşmanın bir yere varmayacağını fark ettim.",
    "Sana sadece biraz ilgi göstermiştim, ama şimdi uzak durmayı tercih ediyorum.",
    "Artık seninle iletişim kurmaya gerek duymuyorum.",
    "Biraz ilgini çekmek istemiştim, ama artık istemiyorum.",
    "Bu konuşma bir yere varmayacak gibi hissediyorum.",
    "Seninle vakit geçirmeyi sevdim, ama artık zamanı geldi.",
    "Sadece arkadaşça konuşmak istemiştim, ama şimdi gerek yok.",
    "İlgimi kaybettim, artık konuşmak istemiyorum.",
    "Seninle sohbet etmek güzeldi, ama artık burada son verelim.",
    "Sana biraz dikkatimi vermek istemiştim, ama şimdi başka şeylere odaklanıyorum.",
    "Seninle daha fazla konuşmanın bir anlamı yok.",
    "Artık ilgimi çekmiyorsun, sadece biraz merak etmiştim.",
    "Sadece vakit geçirmek istemiştim, ama şimdi vazgeçtim.",
    "Bu sohbetin bir anlamı yok, artık devam etmeye gerek yok.",
    "Seninle konuşmak güzeldi, ama artık bitirelim.",
    "Biraz ilgi istemiştim, ama artık başka şeylere yönelmek istiyorum.",
    "Sana zaman ayırmak istemiştim, ama artık bu gerekli değil.",
    "Artık seninle konuşmaya gerek yok, sadece biraz ilgilenmiştim.",
    "Seninle vakit geçirmek güzeldi, ama artık sona erdirmek istiyorum.",
    "Biraz zaman geçirmek istemiştim, ama artık devam etmeyeceğim.",
    "Bu konuşmanın bir sonu olduğunu fark ettim, artık devam etmeyelim.",
    "Sadece sana biraz ilgi göstermek istemiştim, ama şimdi başka şeylere odaklanmalıyım.",
    "Seninle konuşmak hoştu, ama artık bitirelim.",
    "Biraz merak etmiştim, ama artık devam etmeye gerek yok.",
    "Seninle daha fazla vakit geçiremeyeceğimi anladım.",
    "Biraz ilgi istemiştim, ama şimdi başka şeylere yöneliyorum.",
    "Artık seninle konuşmak istemiyorum, bu yüzden burada bırakıyorum.",
    "Bu konuşmanın bir anlamı kalmadı.",
    "Sadece biraz merak etmiştim, ama artık ilgimi kaybettim.",
    "Seninle konuşmak eğlenceliydi, ama artık sona erdirmek istiyorum.",
    "Biraz ilgi göstermek istemiştim, ama artık gerek yok.",
    "Artık seninle vakit geçirmek istemiyorum.",
    "Bu sohbetin bir anlamı yok, artık burada duralım.",
    "Sana biraz ilgi göstermiştim, ama şimdi başka şeylere yönelmek istiyorum.",
    "Artık seninle iletişim kurmak istemiyorum.",
    "Seninle konuşmak hoştu, ama şimdi bitirmek istiyorum.",
    "Sadece biraz vakit geçirmek istemiştim, ama artık vazgeçtim.",
    "Bu konuşmanın bir yere varmayacağını fark ettim, artık devam etmeyeceğim.",
    "Artık seninle konuşmak istemiyorum, sadece biraz ilgi göstermiştim.",
    "Sana biraz ilgi göstermek istemiştim, ama şimdi uzak durmak istiyorum.",
    "Seninle daha fazla konuşmanın bir anlamı kalmadı.",
    "Biraz ilgi istemiştim, ama artık başka şeylere yönelmeliyim.",
    "Sana zaman ayırmak istemiştim, ama artık bu gerekli değil.",
    "Artık seninle konuşmaya gerek yok, sadece biraz ilgilenmiştim.",
    "Seninle vakit geçirmek güzeldi, ama artık sona erdirmek istiyorum.",
    "Biraz zaman geçirmek istemiştim, ama artık devam etmeyeceğim.",
    "Bu konuşmanın bir sonu olduğunu fark ettim, artık devam etmeyelim.",
    "Sadece sana biraz ilgi göstermek istemiştim, ama şimdi başka şeylere odaklanmalıyım.",
    "Seninle konuşmak hoştu, ama artık bitirelim.",
    "Biraz merak etmiştim, ama artık devam etmeye gerek yok.",
    "Seninle daha fazla vakit geçiremeyeceğimi anladım.",
    "Biraz ilgi istemiştim, ama şimdi başka şeylere yöneliyorum.",
    "Artık seninle konuşmak istemiyorum, bu yüzden burada bırakıyorum.",
    "Bu konuşmanın bir anlamı kalmadı.",
    "Sadece biraz merak etmiştim, ama artık ilgimi kaybettim.",
    "Seninle konuşmak eğlenceliydi, ama artık sona erdirmek istiyorum.",
    "Biraz ilgi göstermek istemiştim, ama artık gerek yok.",
    "Artık seninle vakit geçirmek istemiyorum.",
    "Bu sohbetin bir anlamı yok, artık burada duralım.",
    "Sana biraz ilgi göstermiştim, ama şimdi başka şeylere yönelmek istiyorum.",
    "Artık seninle iletişim kurmak istemiyorum.",
    "Seninle konuşmak hoştu, ama şimdi bitirmek istiyorum.",
    "Sadece biraz vakit geçirmek istemiştim, ama artık vazgeçtim.",
    "Bu konuşmanın bir yere varmayacağını fark ettim, artık devam etmeyeceğim.",
    "Artık seninle konuşmak istemiyorum, sadece biraz ilgi göstermiştim.",
    "Sana biraz ilgi göstermek istemiştim, ama şimdi uzak durmak istiyorum.",
    "Seninle daha fazla konuşmanın bir anlamı kalmadı.",
    "Biraz ilgi istemiştim, ama artık başka şeylere yönelmeliyim.",
    "Sana zaman ayırmak istemiştim, ama artık bu gerekli değil.",
    "Artık seninle konuşmaya gerek yok, sadece biraz ilgilenmiştim.",
    "Seninle vakit geçirmek güzeldi, ama artık sona erdirmek istiyorum.",
    "Biraz zaman geçirmek istemiştim, ama artık devam etmeyeceğim.",
    "Bu konuşmanın bir sonu olduğunu fark ettim, artık devam etmeyelim.",
    "Sadece sana biraz ilgi göstermek istemiştim, ama şimdi başka şeylere odaklanmalıyım.",
    "Seninle konuşmak hoştu, ama artık bitirelim.",
    "Biraz merak etmiştim, ama artık devam etmeye gerek yok.",
    "Seninle daha fazla vakit geçiremeyeceğimi anladım.",
    "Biraz ilgi istemiştim, ama şimdi başka şeylere yöneliyorum.",
    "Artık seninle konuşmak istemiyorum, bu yüzden burada bırakıyorum.",
    "Bu konuşmanın bir anlamı kalmadı.",
    "Sadece biraz merak etmiştim, ama artık ilgimi kaybettim.",
    "Seninle konuşmak eğlenceliydi, ama artık sona erdirmek istiyorum.",
    "Biraz ilgi göstermek istemiştim, ama artık gerek yok.",
    "Artık seninle vakit geçirmek istemiyorum.",
    "Bu sohbetin bir anlamı yok, artık burada duralım.",
    "Sana biraz ilgi göstermiştim, ama şimdi başka şeylere yönelmek istiyorum.",
    "Artık seninle iletişim kurmak istemiyorum.",
    "Seninle konuşmak hoştu, ama şimdi bitirmek istiyorum.",
    "Sadece biraz vakit geçirmek istemiştim, ama artık vazgeçtim.",
    "Bu konuşmanın bir yere varmayacağını fark ettim, artık devam etmeyeceğim."
    // Buraya 100 mesajını ekleyebilirsin
];

client.on('interactionCreate', async interaction => {
    if (interaction.isUserContextMenuCommand()) {
        if (interaction.commandName === 'Etkileşim Yasakla') {
            // Sadece sunucu sahibi bu komutu kullanabilir
            if (interaction.guild.ownerId !== interaction.user.id) {
                return interaction.reply({ content: 'Bu komutu sadece sunucu sahibi kullanabilir!', ephemeral: true });
            }

            const userId = interaction.targetId; // Hedeflenen kullanıcının ID'si
            const dataPath = './istenmeyen.json';

            // JSON dosyasını okuma ve güncelleme
            let istenmeyenData = [];
            if (fs.existsSync(dataPath)) {
                const rawData = fs.readFileSync(dataPath);
                istenmeyenData = JSON.parse(rawData);
            }

            // Kullanıcı zaten listede mi?
            if (istenmeyenData.includes(userId)) {
                return interaction.reply({ content: 'Bu kullanıcı zaten etkileşim yasaklı listesinde.', ephemeral: true });
            }

            // ID'yi listeye ekleyip JSON dosyasını güncelleme
            istenmeyenData.push(userId);
            fs.writeFileSync(dataPath, JSON.stringify(istenmeyenData, null, 2));

            // Rastgele bir mesaj seçme
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            // Hedeflenen mesajın olduğu kanala bilgi mesajı gönderme
            interaction.channel.send(`<@${userId}> ${randomMessage}`);

            return interaction.reply({ content: 'Kullanıcı başarıyla etkileşim yasaklı listesine eklendi.', ephemeral: true });
        }
    }
});
client.on('messageCreate', (message) => {
    if (message.author.bot) return; // Bot mesajlarını yok say
    const content = message.content;

    // Toplama işlemi
    if (content.includes('+')) {
        const numbers = content.split('+').map(Number);
        if (numbers.length === 2 && !isNaN(numbers[0]) && !isNaN(numbers[1])) {
            const result = numbers[0] + numbers[1];
            message.reply(`Sonuç: ${result}`);
        }
    }

    // Çıkarma işlemi
    if (content.includes('-')) {
        const numbers = content.split('-').map(Number);
        if (numbers.length === 2 && !isNaN(numbers[0]) && !isNaN(numbers[1])) {
            const result = numbers[0] - numbers[1];
            message.reply(`Sonuç: ${result}`);
        }
    }

    // Çarpma işlemi
    if (content.includes('*')) {
        const numbers = content.split('*').map(Number);
        if (numbers.length === 2 && !isNaN(numbers[0]) && !isNaN(numbers[1])) {
            const result = numbers[0] * numbers[1];
            message.reply(`Sonuç: ${result}`);
        }
    }

    // Bölme işlemi
    if (content.includes('/')) {
        const numbers = content.split('/').map(Number);
        if (numbers.length === 2 && !isNaN(numbers[0]) && !isNaN(numbers[1])) {
            if (numbers[1] === 0) {
                message.reply('Bir sayıyı 0\'a bölemezsin!');
            } else {
                const result = numbers[0] / numbers[1];
                message.reply(`Sonuç: ${result}`);
            }
        }
    }
});
client.login(process.env.TOKEN)

