const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = './warns.json';
const kamichashPath = './kamicash.json';
const communityPath = './topluluk.json';
const birthdayPath = './birthdays.json';
const blackPath = './black.json';
const voiceDataPath = './ses_verileri.json';
const k23Data = './k23.json';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
    console.log('Bot hazır!');
});

client.login(process.env.TOKEN)

const logChannelID = '1268984173042077770'; // Log kanalınızın ID'sini buraya ekleyin
const appealChannelID = '1267875133779873986'; // İtirazların yapılacağı kanalın ID'sini buraya ekleyin
const ownerId = '307614755386949633'; // Sunucu sahibinin ID'sini buraya ekleyin

client.on('ready', async () => {
    const guild = client.guilds.cache.get('1083853598020096051'); // Sunucu ID'sini ekleyin

    // Create the commands
    const commands = [
        {
            name: 'uyarı',
            description: 'Bir kullanıcıya uyarı ver.',
            options: [
                {
                    name: 'kullanıcı',
                    type: ApplicationCommandOptionType.User,
                    description: 'Uyarılacak kullanıcı',
                    required: true
                },
                {
                    name: 'neden',
                    type: ApplicationCommandOptionType.String,
                    description: 'Uyarı nedeni',
                    required: true
                }
            ]
        },
        {
            name: 'sicil',
            description: 'Bir kullanıcının uyarı sicilini göster.',
            options: [
                {
                    name: 'kullanıcı',
                    type: ApplicationCommandOptionType.User,
                    description: 'Sicili gösterilecek kullanıcı',
                    required: true
                }
            ]
        }
    ];

    // Register each command
    for (const command of commands) {
        await guild.commands.create(command);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'uyarı') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yeterli yetkiniz yok.', ephemeral: true });
        }

        const user = interaction.options.getUser('kullanıcı');
        const reason = interaction.options.getString('neden');

        if (user.id === ownerId) {
            // Sunucu sahibine uyarı atılmaya çalışılıyor
            const timeoutDuration = 30 * 1000; // 30 saniye

            // Uyarı atmaya çalışan kullanıcıya timeout ver
            interaction.member.timeout(timeoutDuration, 'Sunucu sahibine uyarı atmaya çalıştı')
                .then(() => {
                    const embed = new EmbedBuilder()
                        .setTitle('Hata: Sunucu Sahibine Uyarı Atmaya Çalışmak')
                        .setDescription(`<@${interaction.user.id}> sunucu sahibine uyarı atmaya çalışmak ? 🤓`)
                        .setImage('https://media.discordapp.net/attachments/1128963757100519424/1270338780196245640/cartenon-temple-sung-jin-woo.gif?ex=66b356ae&is=66b2052e&hm=6f7334181c19171633527e4503ffd76a6a638935a5ef0e3d3f0a15cff26003c6&=')
                        .setColor(0xFF0000)
                        .setTimestamp();
                    
                    interaction.reply({ embeds: [embed] });
                })
                .catch(error => {
                    console.error('Timeout işlemi başarısız:', error);
                    interaction.reply({ content: 'Timeout işlemi başarısız oldu.', ephemeral: true });
                });
            return;
        }

        if (!user || !reason) {
            return interaction.reply({ content: 'Lütfen geçerli bir kullanıcı ve neden belirtin.', ephemeral: true });
        }

        let warns = {};
        if (fs.existsSync(path)) {
            warns = JSON.parse(fs.readFileSync(path, 'utf8'));
        }
        if (!warns[user.id]) {
            warns[user.id] = [];
        }

        warns[user.id].push({
            reason: reason,
            date: new Date().toISOString(),
            moderator: interaction.user.id,
            channel: interaction.channel.id
        });

        fs.writeFileSync(path, JSON.stringify(warns, null, 2));

        const appealChannel = interaction.guild.channels.cache.get(appealChannelID);

        const userWarns = warns[user.id].length;
        const timeoutDuration = 60000 * userWarns; // Uyarı sayısı kadar dakika

        const embed = new EmbedBuilder()
            .setTitle('Kullanıcı Uyarıldı')
            .setDescription(`**Kullanıcı:** <@${user.id}>\n**Neden:** ${reason}\n**Moderatör:** ${interaction.user.tag}\n**Kanal:** ${interaction.channel.name}\n**Toplam Uyarı:** ${userWarns}\n**Timeout Süresi:** ${userWarns} dakika\n\nEğer bu uyarıya itiraz etmek istiyorsanız, lütfen <#${appealChannelID}> kanalına başvurun.`)
            .setColor(0xFF0000)
            .setTimestamp();

        const logEmbed = new EmbedBuilder()
            .setTitle('Uyarı Logu')
            .setDescription(`**Kullanıcı:** ${user.tag} (${user.id})\n**Neden:** ${reason}\n**Moderatör:** ${interaction.user.tag}\n**Kanal:** ${interaction.channel.name}\n**Tarih:** ${new Date().toLocaleString()}`)
            .setColor(0xFFA500)
            .setTimestamp();

        const logChannel = interaction.guild.channels.cache.get(logChannelID) || interaction.guild.channels.cache.find(channel => channel.name === 'uyarı-logları');
        if (logChannel) {
            logChannel.send({ embeds: [logEmbed] }).then(() => {
                logChannel.send(`Lütfen uyarı kanıtlarını buraya yükleyin <@${interaction.user.id}>.`);
            });
        }

        // Kullanıcının son 10 mesajını log kanalına gönder
        const userMessages = await interaction.channel.messages.fetch({ limit: 100 });
        const userLastMessages = userMessages.filter(m => m.author.id === user.id).first(10);

        let messagesContent = '';
        userLastMessages.forEach((msg, idx) => {
            messagesContent += `**${idx + 1}. Mesaj**: ${msg.content}\n`;
        });

        if (logChannel) {
            const userMessagesEmbed = new EmbedBuilder()
                .setTitle(`${user.tag} Son 10 Mesajı`)
                .setDescription(messagesContent || 'Son 10 mesaj bulunamadı.')
                .setColor(0xFFA500)
                .setTimestamp();

            logChannel.send({ embeds: [userMessagesEmbed] });
        }

        // Kullanıcıya DM gönder
        const dmEmbed = new EmbedBuilder()
            .setTitle('Uyarı Aldınız')
            .setDescription(`**Neden:** ${reason}\n**Moderatör:** ${interaction.user.tag}\n**Kanal:** ${interaction.channel.name}\n**Toplam Uyarı:** ${userWarns}\n**Timeout Süresi:** ${userWarns} dakika\n\nEğer bu uyarıya itiraz etmek istiyorsanız, lütfen sunucudaki itiraz kanalına başvurun.`)
            .setColor(0xFF0000)
            .setTimestamp();

        user.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`${user.tag} kullanıcısına DM gönderilemedi.`);
        });

        // Kullanıcıya timeout ver
        const member = await interaction.guild.members.fetch(user.id);
        member.timeout(timeoutDuration, reason)
            .then(() => {
                interaction.reply({ embeds: [embed] });
            })
            .catch(error => {
                console.error('Timeout işlemi başarısız:', error);
                interaction.reply({ content: 'Uyarı verildi ancak timeout işlemi başarısız oldu.', ephemeral: true });
            });
    }
});
const hareketliEmoji = '<a:kaboostmi:1336716052310134826>';
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'sicil') {
        const user = interaction.options.getUser('kullanıcı');
        const member = await interaction.guild.members.fetch(user.id);

        let warns = {};
        if (fs.existsSync(path)) {
            warns = JSON.parse(fs.readFileSync(path, 'utf8'));
        }

        let kamichash = {};
        if (fs.existsSync(kamichashPath)) {
            kamichash = JSON.parse(fs.readFileSync(kamichashPath, 'utf8'));
        }

        let black = {};
        if (fs.existsSync(blackPath)) {
            black = JSON.parse(fs.readFileSync(blackPath, 'utf8'));
        }

        let communityPoints = {};
        if (fs.existsSync(communityPath)) {
            communityPoints = JSON.parse(fs.readFileSync(communityPath, 'utf8'));
        }

        let voiceData = {};
        if (fs.existsSync(voiceDataPath)) {
            voiceData = JSON.parse(fs.readFileSync(voiceDataPath, 'utf8'));
        }

        let birthdays = {};
        if (fs.existsSync(birthdayPath)) {
            birthdays = JSON.parse(fs.readFileSync(birthdayPath, 'utf8'));
        }

        // Read KC data from k23.json
        let k23Data = {};
        if (fs.existsSync('k23.json')) {
            k23Data = JSON.parse(fs.readFileSync('k23.json', 'utf8'));
        }

        const messageCount = kamichash[user.id] !== undefined ? kamichash[user.id] : 0;
        const curseCount = black[user.id] !== undefined ? black[user.id].count : 0;
        const communityScore = communityPoints[user.id] !== undefined ? communityPoints[user.id] : 0;
        
        const totalVoiceTimeMs = voiceData[user.id] !== undefined ? voiceData[user.id].toplamSure : 0;
        const totalVoiceTime = Math.floor(totalVoiceTimeMs / 1000);

        const hoursInVoice = Math.floor(totalVoiceTime / 3600);
        const minutesInVoice = Math.floor((totalVoiceTime % 3600) / 60);
        const secondsInVoice = totalVoiceTime % 60;

        const formattedVoiceTime = `${hoursInVoice} saat, ${minutesInVoice} dakika, ${secondsInVoice} saniye`;

        const healthPercentage = messageCount === 0 ? 100 : 100 - (curseCount / messageCount) * 100;
        const warnCount = warns[user.id] ? warns[user.id].length : 0;
        let adjustedHealth = Math.max(0, healthPercentage - (warnCount * 6));
        adjustedHealth += communityScore * 0.2;
        adjustedHealth += (hoursInVoice / 10) * 0.3;

        adjustedHealth = Math.min(100, Math.max(0, adjustedHealth));

        const joinDate = member.joinedAt.toLocaleDateString('tr-TR');
        const avatarURL = member.user.displayAvatarURL();

        const boostInfo = member.premiumSince
            ? `Bu üye sunucuyu ${Math.floor((Date.now() - member.premiumSince.getTime()) / (1000 * 60 * 60 * 24))} gün boyunca boostluyor. ${hareketliEmoji}`
            : "Booster bilgisi yok, boostlamıyor.";

        // Calculate days until next birthday
        let birthdayInfo = "Doğum günü bilgisi yok, **/dogumgunu** ile kaydedin.";
        if (birthdays[user.id]) {
            const today = new Date();
            const birthDateThisYear = new Date(today.getFullYear(), birthdays[user.id].ay - 1, birthdays[user.id].gün);
            const nextBirthday = birthDateThisYear > today ? birthDateThisYear : new Date(today.getFullYear() + 1, birthdays[user.id].ay - 1, birthdays[user.id].gün);
            const daysUntilBirthday = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

            birthdayInfo = `${daysUntilBirthday} gün sonra doğum günü.`;
        }

        // Get the user's KC amount
        const kcAmount = k23Data[user.id]?.kc || 0;

        const getColorByHealth = (health) => {
            if (health > 90) return 0x00FF00;
            if (health > 80) return 0x7FFF00;
            if (health > 70) return 0xFFFF00;
            if (health > 60) return 0xFFD700;
            if (health > 50) return 0xFFA500;
            if (health > 40) return 0xFF8C00;
            if (health > 30) return 0xFF4500;
            if (health > 20) return 0xFF0000;
            if (health > 10) return 0xB22222;
            return 0x8B0000;
        };

        const getHealthBar = (percentage) => {
            const greenBlock = '🟩';
            const yellowBlock = '🟨';
            const orangeBlock = '🟧';
            const redBlock = '🟥';
            const emptyBlock = '⬛';

            const totalBlocks = 7;
            const filledBlocks = Math.round((percentage / 100) * totalBlocks);

            let colorBlock;
            if (percentage > 75) colorBlock = greenBlock;
            else if (percentage > 50) colorBlock = yellowBlock;
            else if (percentage > 25) colorBlock = orangeBlock;
            else colorBlock = redBlock;

            return colorBlock.repeat(filledBlocks) + emptyBlock.repeat(totalBlocks - filledBlocks);
        };

        const sicilEmbed = new EmbedBuilder()
            .setTitle(`${user.tag} Sicili`)
            .setThumbnail(avatarURL)
            .addFields(
                { name: 'Katılım Tarihi', value: joinDate, inline: true },
                { name: 'Toplam Mesaj Sayısı', value: messageCount.toString(), inline: true },
                { name: 'Toplam Küfür Sayısı', value: curseCount.toString(), inline: true },
                { name: 'Topluluk Puanı', value: communityScore.toString(), inline: true },
                { name: 'Toplam Uyarı Sayısı', value: warnCount.toString(), inline: true },
                { name: 'Toplam Ses Süresi', value: formattedVoiceTime, inline: true },
                { name: 'Ruh Sağlığı Yüzdesi', value: `${adjustedHealth.toFixed(2)}%`, inline: false },
                { name: 'Ruh Sağlığı Çubuğu', value: getHealthBar(adjustedHealth), inline: false },
                { name: 'Boost Bilgisi', value: boostInfo, inline: false },
                { name: 'Doğum Günü', value: birthdayInfo, inline: false }               
            )
            .setColor(getColorByHealth(adjustedHealth))
            .setTimestamp();

        await interaction.reply({ embeds: [sicilEmbed] });
    }
});

const schedule = require('node-schedule');

const expiredWarnLogChannelID = '1293209506574106645'; // Zaman aşımına uğrayan uyarıların loglanacağı kanalın ID'si

// Warn temizleme görevini her 30 saniyede bir çalıştır
schedule.scheduleJob('0 0 * * *', async () => {
    let warns = {};
    if (fs.existsSync(path)) {
        warns = JSON.parse(fs.readFileSync(path, 'utf8'));
    }

    const currentDate = new Date();
    const oneMonthInMs = 30 * 24 * 60 * 60 * 1000; // 1 ayı milisaniye cinsinden hesapla
    let isModified = false;
    const expiredWarnsLog = [];

    for (const [userId, userWarns] of Object.entries(warns)) {
        // Kullanıcının geçersiz uyarılarını filtrele
        const validWarns = userWarns.filter(warn => {
            const warnDate = new Date(warn.date);
            if (currentDate - warnDate < oneMonthInMs) {
                return true; // Henüz zamanı dolmamış
            } else {
                expiredWarnsLog.push({ userId, warn }); // Zaman aşımına uğramış uyarıyı loglamak için ekle
                isModified = true; // Değişiklik olduğunu belirt
                return false; // Uyarıyı kaldır
            }
        });

        // Kullanıcının geçerli uyarılarını güncelle
        if (validWarns.length > 0) {
            warns[userId] = validWarns;
        } else {
            delete warns[userId]; // Kullanıcının uyarısı kalmadıysa onu sil
        }
    }

    if (isModified) {
        fs.writeFileSync(path, JSON.stringify(warns, null, 2));

        // Zaman aşımına uğramış uyarıları expiredWarnLogChannelID'ye logla
        const expiredWarnLogChannel = client.channels.cache.get(expiredWarnLogChannelID);
        if (expiredWarnLogChannel) {
            const maxFieldsPerEmbed = 10; // Embed başına maksimum alan sayısı
            for (let i = 0; i < expiredWarnsLog.length; i += maxFieldsPerEmbed) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('Zaman Aşımına Uğramış Uyarılar')
                    .setDescription('Aşağıdaki kullanıcıların uyarıları zaman aşımına uğradı ve kaldırıldı:')
                    .setColor(0x00FF00)
                    .setTimestamp();

                expiredWarnsLog.slice(i, i + maxFieldsPerEmbed).forEach(({ userId, warn }) => {
                    logEmbed.addFields({
                        name: `<@${userId}>`,
                        value: `**Neden:** ${warn.reason}\n**Tarih:** ${warn.date}`
                    });
                });

                try {
                    await expiredWarnLogChannel.send({ embeds: [logEmbed] });
                } catch (error) {
                    console.error('Embed gönderilirken hata oluştu:', error);
                }
            }
        }
    }
});
