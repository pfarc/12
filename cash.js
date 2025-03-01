const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const ms = require('ms'); // ms kütüphanesi ile süreyi hesaplayacağız
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Kullanıcıların KC miktarını saklamak için bir JSON dosyası yolu
const kcFile = './k23.json';

// JSON dosyasından güncel verileri okuma fonksiyonu
function readKcData() {
    if (fs.existsSync(kcFile)) {
        return JSON.parse(fs.readFileSync(kcFile, 'utf8'));
    } else {
        return {};
    }
}
// KC verilerini dosyaya yazma fonksiyonu
function writeKcData(data) {
    try {
        fs.writeFileSync(kcFile, JSON.stringify(data, null, 2), 'utf8');
        console.log('KC verileri başarıyla kaydedildi.');
    } catch (error) {
        console.error('Veriler dosyaya kaydedilirken bir hata oluştu:', error);
    }
}

// KC verilerini dosyaya yazma fonksiyonu
function readKcData() {
    if (fs.existsSync(kcFile)) {
        try {
            return JSON.parse(fs.readFileSync(kcFile, 'utf8'));
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            return {};
        }
    } else {
        return {};
    }
}

// Tüm üyeleri başlatırken initialize edilmiş olanları kontrol et ve ekle
client.once('ready', async () => {
    console.log(`Bot hazır: ${client.user.tag}`);
    initializeAllMembers();

    let kamicash = readKcData();
    
    client.guilds.cache.forEach(async guild => {
        const members = await guild.members.fetch();
        
        members.forEach(member => {
            if (member.roles.cache.has('1083859074002727053') && (!kamicash[member.id] || !kamicash[member.id].booster)) {
                if (!kamicash[member.id]) {
                    kamicash[member.id] = { kc: 100, initialized: 1, joinedAt: member.joinedAt.getTime(), lastDaily: null, stack: 0, booster: 1 };
                } else {
                    kamicash[member.id].kc += 5000;
                    kamicash[member.id].booster = 1;
                }
            }
        });

        writeKcData(kamicash);
    });
});

client.on('guildMemberAdd', member => {
    if (!member || !member.id) {
        return console.error('Üye objesi geçerli değil.');
    }

    let kamicash = readKcData();
    
    if (!kamicash[member.id]) {
        kamicash[member.id] = { kc: 100, initialized: 1, joinedAt: Date.now(), lastDaily: null, stack: 0 };
        writeKcData(kamicash);
    }
});

client.on('messageCreate', async message => {
    if (!message.member || !message.guild || message.author.bot) {
        return; // Eğer message.member boşsa, message bir sunucuda değilse veya mesaj bot tarafından gönderildiyse, işlem yapılmaz.
    }

    let kamicash = readKcData(); // En güncel KC verilerini oku

    if (message.content.startsWith('!transfer')) {
        const args = message.content.split(' ');
        const target = message.mentions.members.first();
        const amount = parseInt(args[2], 10);

        if (!target || isNaN(amount) || amount <= 0) {
            return message.reply('Lütfen geçerli bir üye ve miktar belirtin. Örnek: `!transfer @üye 50`');
        }

        const sender = message.member;

        // Üyenin sunucuda kalma süresi (3 günden fazla olmalı)
        const joinedAt = sender.joinedAt;
        const timeInServer = Date.now() - joinedAt;
        const threeDays = 3 * 24 * 60 * 60 * 1000; // 3 gün

        if (timeInServer < threeDays) {
            return message.reply('Bu komutu kullanabilmek için sunucuda en az 3 gündür bulunuyor olmalısınız.');
        }

        // Gönderen ve alıcı KC kontrolü
        if (!kamicash[sender.id]) {
            kamicash[sender.id] = { kc: 100, initialized: 1, joinedAt: joinedAt.getTime(), lastDaily: null, stack: 0 };
        }

        if (!kamicash[target.id]) {
            kamicash[target.id] = { kc: 100, initialized: 1, joinedAt: target.joinedAt.getTime(), lastDaily: null, stack: 0 };
        }

        if (kamicash[sender.id].kc < amount) {
            return message.reply('Yeterli KC miktarınız yok.');
        }

        // Transfer işlemi
        kamicash[sender.id].kc -= amount;
        kamicash[target.id].kc += amount;

        // JSON dosyasını güncelle
        writeKcData(kamicash);

        // Başarılı işlem mesajı
        return message.reply(`${amount} KC başarıyla ${target.user.tag}'a transfer edildi.`);
    } else if (message.content.startsWith('!günlük')) {
        const memberId = message.member.id;

        // Kullanıcının KC verisi yoksa oluştur
        if (!kamicash[memberId]) {
            kamicash[memberId] = { kc: 100, initialized: 1, joinedAt: Date.now(), lastDaily: null, stack: 0 };
        }

        const lastDaily = kamicash[memberId].lastDaily;
        const oneDay = 24 * 60 * 60 * 1000;  // 1 gün (24 saat)
        const now = Date.now();

        // Eğer son günlük alındı tarihinden 2 gün geçtiyse stack sıfırlanacak
        if (lastDaily && (now - lastDaily) >= oneDay * 2) {
            kamicash[memberId].stack = 0; // Stack sıfırlanıyor
            console.log('Stack sıfırlandı');
        }

        // Kullanıcının günlük ödülünü alıp almadığını kontrol et
        if (lastDaily && (now - lastDaily) < oneDay) {
            const nextClaimTime = new Date(lastDaily + oneDay); // Bir sonraki günlük ödül zamanı
            return message.reply(`SİSTEM SIFIRLANDI YENİ KASA SİSTEMİNİ BEKLEYİN KCLER DÜZELTİLECEK Günlük ödülünüzü aldınız. Bir sonraki ödülünüzü şu saatte alabilirsiniz: ${nextClaimTime.toLocaleString()}. Şu anki stack: ${kamicash[memberId].stack}`);
        }

        // Günlük ödül verme ve stack artırma işlemi
        const dailyReward = 100 + (kamicash[memberId].stack * 10); // Stack'e göre ödül
        kamicash[memberId].kc += dailyReward;
        kamicash[memberId].lastDaily = now;
        kamicash[memberId].stack += 1; // Stack 1 artırılıyor

        // Verileri kaydet
        writeKcData(kamicash);

        return message.reply(`Günlük ödülünüz olan ${dailyReward} KC hesabınıza eklendi. Şu anki stack: ${kamicash[memberId].stack}`);
    } else if (message.content.startsWith('!kc')) {
        // En zengin ilk 10 kişiyi listele
        const sortedKc = Object.entries(kamicash)
            .sort(([, a], [, b]) => b.kc - a.kc)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('En Zengin 10 Kişi')
            .setColor('#FFD700')
            .setTimestamp();

        sortedKc.forEach(([id, data], index) => {
            const member = message.guild.members.cache.get(id);
            if (member) {
                embed.addFields({ name: `${index + 1}. ${member.user.tag}`, value: `KC: ${data.kc}`, inline: false });
            }
        });

        return message.channel.send({ embeds: [embed] });
    } else {
        // Her mesaj için 0.2 KC ekle
        const memberId = message.member.id;

        if (!kamicash[memberId]) {
            kamicash[memberId] = { kc: 100, initialized: 1, joinedAt: Date.now(), lastDaily: null, stack: 0 };
        }

        // Mesaja her gönderimde 0.2 KC ekle
        kamicash[memberId].kc += 0.02;

        // Toplam KC'yi 2 ondalık basamağa yuvarla
        kamicash[memberId].kc = parseFloat(kamicash[memberId].kc.toFixed(2));

        // JSON dosyasını güncelle
        writeKcData(kamicash);
    }
});
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, user } = interaction;

    if (commandName === 'kamicash') {
        let kamicash = readKcData(); // En güncel KC verilerini oku

        if (!kamicash[user.id]) {
            kamicash[user.id] = { kc: 100, initialized: 1, joinedAt: Date.now(), lastDaily: null, stack: 0 };
            writeKcData(kamicash);
        }

        const kcAmount = kamicash[user.id].kc;
        const lastDaily = kamicash[user.id].lastDaily;
        const now = Date.now();
        const oneDay = ms('1d');
        let dailyBonus = 0;
        let timeLeft = 0;

        // Kullanıcının günlük ödül alıp almadığını kontrol et
        if (lastDaily && (now - lastDaily) < oneDay) {
            dailyBonus = 100 + (kamicash[user.id].stack * 10); // Kullanıcının alabileceği bonus miktarı
            timeLeft = oneDay - (now - lastDaily); // Kalan süreyi hesapla
        }

        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'in Kamicash'i`)
            .setColor('Random')
            .setDescription(`**Toplam ${kcAmount} KC'in var.**\n*günlük bonusun: ${dailyBonus} KC*`)
            .setFooter({ text: 'Yasal Uyarı: Bu sistemde kullanılan "kc" yalnızca oyun içi bir değerdir ve gerçek para birimi ile ilgisi yoktur. "kc" ile yapılan işlemler gerçek ekonomik değer taşımaz ve hiçbir şekilde para transferi, mal veya hizmet alımı gibi finansal işlemlerde kullanılmamalıdır.' });

        // Eğer kalan süre varsa, saat ve dakika formatında göstermek için güncelle
        if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60)); // Saat hesaplama
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)); // Dakika hesaplama
            embed.addFields({ name: 'Kalan Süre', value: `Günlük bonusun için **${hours} saat ${minutes} dakika** kaldı.` });
        } else {
            embed.addFields({ name: 'Kalan Süre', value: 'Günlük bonusunu alabilirsin!' });
        }

        await interaction.reply({ embeds: [embed] });
    }
});

async function initializeAllMembers() {
    let kamicash = readKcData(); // Başlangıçta verileri oku

    client.guilds.cache.forEach(guild => {
        guild.members.fetch().then(members => {
            members.forEach(member => {
                if (!kamicash[member.id]) {
                    kamicash[member.id] = { kc: 100, initialized: 1, joinedAt: member.joinedAt.getTime(), lastDaily: null, stack: 0 };
                }
            });

            writeKcData(kamicash); // Değişiklikleri dosyaya kaydet
        });
    });
}
client.login(process.env.TOKEN)
