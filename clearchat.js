const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Komutun çalışmasını istediğiniz rollerin ID'leri
const allowedRoles = ['1268966937598365789', '1258029689755144193']; // Buraya izinli rol ID'lerini yazın
const logChannelId = '1268984173042077770'; // Log dosyasını göndermek istediğiniz kanalın ID'si

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!temizle')) return;

    const memberRoles = message.member.roles.cache.map(role => role.id);
    if (!allowedRoles.some(role => memberRoles.includes(role))) {
        return message.reply('Bu komutu kullanmak için yetkiniz yok!');
    }

    const args = message.content.split(' ');
    const deleteCount = parseInt(args[1], 10);

    if (!deleteCount || deleteCount < 1 || deleteCount > 100) {
        return message.reply('Lütfen 1 ile 100 arasında bir sayı belirtin.');
    }

    let deletedCount = 0;
    const logContent = [];
    const filesToSend = [];

    while (deletedCount < deleteCount) {
        const remaining = deleteCount - deletedCount;
        const fetchCount = Math.min(remaining, 50); // En fazla 50 mesaj çek
        const fetchedMessages = await message.channel.messages.fetch({ limit: fetchCount });
        const messagesToDelete = fetchedMessages.filter(msg => msg.id !== message.id);

        if (messagesToDelete.size === 0) break;

        for (const msg of messagesToDelete.values()) {
            const timestamp = msg.createdAt.toLocaleString('tr-TR', { hour12: false });
            logContent.push(`${msg.author.username} (${msg.author.id}): "${msg.content || '[Görsel veya Video]'}" [${timestamp}]`);

            if (msg.attachments.size > 0) {
                for (const [attachmentId, attachment] of msg.attachments.entries()) {
                    const safeFileName = `${attachmentId}_${attachment.name.replace(/[^a-z0-9_\-\.]/gi, '_')}`;
                    const filePath = path.join(__dirname, 'downloads', safeFileName);

                    try {
                        const response = await axios.get(attachment.url, { responseType: 'stream' });
                        const writer = fs.createWriteStream(filePath);
                        response.data.pipe(writer);
                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });
                        filesToSend.push({ attachment: filePath, name: safeFileName });
                        logContent.push(`--> Dosya: ${safeFileName} [URL: ${attachment.url}]`);
                    } catch (err) {
                        console.error(`Dosya indirilirken hata oluştu: ${attachment.url}`, err);
                    }
                }
            }
        }

        await message.channel.bulkDelete(messagesToDelete, true).catch(err => {
            console.error(err);
            return message.reply('Mesajlar silinirken bir hata oluştu.');
        });

        deletedCount += messagesToDelete.size;
    }

    const fileName = path.join(__dirname, `silinen_mesajlar_${Date.now()}.txt`);
    fs.writeFileSync(fileName, logContent.join('\n'));

    // Log dosyasını ve ek dosyaları log kanalına gönder
    const logChannel = await client.channels.fetch(logChannelId);
    if (logChannel.isTextBased()) {
        try {
            const allFiles = [{ attachment: fileName, name: `silinen_mesajlar_${Date.now()}.txt` }, ...filesToSend];
            for (let i = 0; i < allFiles.length; i += 10) {
                const fileChunk = allFiles.slice(i, i + 10); // 10'luk gruplara böl
                await logChannel.send({
                    content: i === 0 ? 'Silinen mesajların logları:' : 'Ek dosyalar devam ediyor:',
                    files: fileChunk,
                });
            }
        } catch (err) {
            console.error('Log kanalı mesajı gönderilemedi:', err);
        }
    }

    // Geçici dosyaları temizle
    fs.unlinkSync(fileName);
    for (const file of filesToSend) {
        try {
            fs.unlinkSync(file.attachment);
        } catch (err) {
            console.error('Geçici dosya silinirken hata oluştu:', file.attachment, err);
        }
    }

    // Bilgilendirme mesajı gönder
    const replyMessage = await message.channel.send(`${deletedCount} mesaj silindi.`);
    setTimeout(() => replyMessage.delete().catch(console.error), 5000);
});

client.on('ready', () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
});

client.login(process.env.TOKEN);
