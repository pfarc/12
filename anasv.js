// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials,ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,  
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel] // DM'leri almak için gerekli
});

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // Log kanalının ID'si
const NOTIFY_USER_ID = process.env.NOTIFY_USER_ID; // Bilgi gönderilecek kullanıcı ID'si

client.once('ready', () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı.`);
});

client.on('guildBanAdd', async (ban) => {
    try {
        const { guild, user } = ban;

        // Audit log'ları çekme
        const fetchedLogs = await guild.fetchAuditLogs({
            limit: 1,
            type: 22, // Ban işlemi için tür 22
        });

        const banLog = fetchedLogs.entries.first();
        if (!banLog) {
            console.log(`Üye ${user.tag} sunucudan banlandı ancak audit log bulunamadı.`);
            return;
        }

        const { executor, target, reason, createdAt } = banLog;

        // Ban işlemini yapan moderatör
        const moderator = executor;

        // Banlanan üyenin bilgileri
        const bannedUser = user;

        // İlk embed mesajını oluşturma
        const embed = new EmbedBuilder()
            .setTitle('Üye Banlandı')
            .setColor(0xff0000)
            .addFields(
                { name: 'Banlanan Üye', value: `${bannedUser.tag} (ID: ${bannedUser.id})`, inline: false },
                { name: 'Banlayan Moderatör', value: `${moderator.tag} (ID: ${moderator.id})`, inline: false },
                { name: 'Ban Zamanı', value: `${createdAt}`, inline: false },
                { name: 'Sebep', value: `${reason || 'Belirtilmemiş'}`, inline: false }
            )
            .setTimestamp();

        // Moderatöre DM gönder ve nedenini sor
        let moderatorMessage;
        try {
            moderatorMessage = await moderator.send(`Merhaba ${moderator.username},\n\n${bannedUser.tag} adlı kullanıcıyı banladınız. Neden banladığınızı açıklayabilir misiniz? (Lütfen tek bir cümle ile cevap verin eğer uzun açıklaması varsa lütfen kanıt kanalında açıklama yapın.)`);
        } catch (dmError) {
            console.log(`Moderatöre DM gönderilemedi: ${dmError}`);
            return;
        }

        // Mesaj kolektörü tanımlama
        const filter = (response) => response.author.id === moderator.id && response.content.trim().split(' ').length < 20; // 20 kelime sınırı
        const collector = moderatorMessage.channel.createMessageCollector({ filter, max: 1, time: 60000 }); // 60 saniye süre

        collector.on('collect', async (collected) => {
            const moderatorResponse = collected.content;

            // Yeni embed'i güncelle
            embed.addFields({ name: 'Moderatör Açıklaması', value: moderatorResponse, inline: false });

            // Log kanalına gönder
            const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel && logChannel.isTextBased()) {
                await logChannel.send({ embeds: [embed] });
            } else {
                console.log('Log kanalı bulunamadı veya metin kanalı değil.');
            }

            // Belirli bir kullanıcıya da gönder
            const notifyUser = await client.users.fetch(NOTIFY_USER_ID);
            if (notifyUser) {
                await notifyUser.send({ embeds: [embed] });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                console.log(`Moderatör ${moderator.tag} 60 saniye içinde cevap vermedi.`);
            } else {
                console.log('Mesaj koleksiyonu tamamlandı.');
            }
        });

    } catch (error) {
        console.error('Ban olayını işlerken hata oluştu:', error);
    }
});

const authorizedRoleId = '1268966937598365789'; // Kullanabilecek rolün ID'sini girin
const mediaBannedUsers = new Map(); // Medya yasağı olan kullanıcıları ve yasak bitiş sürelerini saklar

client.on('messageCreate', async message => {
    // Kullanıcının medya kısıtlaması olup olmadığını kontrol eder, varsa ve medya içeriyorsa siler
    if (mediaBannedUsers.has(message.author.id) && (message.attachments.size > 0 || message.embeds.length > 0)) {
        const expiration = mediaBannedUsers.get(message.author.id);
        if (Date.now() < expiration) {
            await message.delete();
            message.channel.send(`Üzgünüm ${message.author}, şu anda medya gönderme yetkiniz kısıtlanmıştır.`);
            return;
        } else {
            mediaBannedUsers.delete(message.author.id); // Süre dolduysa kısıtlamayı kaldırır
        }
    }

    // Kullanıcıyı medya gönderiminden kısıtlayan komut
    if (message.content.startsWith('!mban')) {
        if (!message.member.roles.cache.has(authorizedRoleId)) {
            return message.reply('Bu komutu kullanma yetkiniz yok.');
        }

        const userToRestrict = message.mentions.users.first();
        if (!userToRestrict) {
            return message.reply('Lütfen kısıtlamak istediğiniz kullanıcıyı etiketleyin.');
        }

        const oneHour = 60 * 60 * 1000; // 1 saat milisaniye cinsinden
        mediaBannedUsers.set(userToRestrict.id, Date.now() + oneHour);

        message.channel.send(`${userToRestrict} 1 saat boyunca medya gönderiminden kısıtlandı.`);
    }
});
const REPORT_CHANNEL_ID = '1268984173042077770';

// Kullanıcıları ve mesaj zamanlarını saklamak için bir Map oluştur
const userTimeouts = new Map();
const TIMEOUT_DURATION = 300000; // 30 saniye

// Mesaj algılama ve cevap verme
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Zaman aşımı kontrolü
    const now = Date.now();
    const lastMessageTime = userTimeouts.get(message.author.id);

    if (lastMessageTime && now - lastMessageTime < TIMEOUT_DURATION) {
        return; // Kullanıcı zaman aşımı süresinde, mesaj işlemden geçirilmez
    }

    // Anahtar kelimeleri kontrol et
    const keywords = [
        'sorufgvhgfhfdghfghfghhfgnlu',

    ];

    if (keywords.some(keyword => message.content.toLowerCase().includes(keyword))) {
        // Embed oluştur
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Sorun bendemi o_O')
            .setDescription('Bu sorun benle mi alakalı? Eğer öyleyse aşağıdaki butona basarak bana belirt.')
            .setImage('https://cdn.discordapp.com/attachments/1083853598716346454/1313591971364733069/1921996_759c3.gif?ex=6750b15b&is=674f5fdb&hm=7c437940e7f43523ae0eed974237df40ee73f18d540e1a0aec95ec5b3efc8cb0&')
            .setFooter({ text: 'Sorun yok burdayım!', iconURL: client.user.displayAvatarURL() });

        // Buton oluştur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('report_problem')
                    .setLabel('Sorun Bende mi?')
                    .setStyle(ButtonStyle.Primary)
            );

        // Mesaja embed ve buton ekle
        await message.reply({ embeds: [embed], components: [row] });

        // Kullanıcının zaman aşımı bilgisini güncelle
        userTimeouts.set(message.author.id, now);
    }
});

// Buton tıklama olayını dinle
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'report_problem') {
        // Butonu devre dışı bırak
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('report_problem')
                    .setLabel('Sorun Bildirildi')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true) // Butonu devre dışı bırak
            );

        // Kullanıcıya yanıt ver
        await interaction.update({ components: [row] });

        // Rapor edilen kanala mesaj gönder
        const reportChannel = client.channels.cache.get(REPORT_CHANNEL_ID);
        if (reportChannel) {
            await reportChannel.send(`⚠️ ${interaction.user.tag} "Botta sorun olabilir mi?" dedi.`);
        }
    }
});
client.login(process.env.TOKEN);
