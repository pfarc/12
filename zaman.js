global.ReadableStream = require('stream').Readable;
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

const channelId = '1263851762742329476'; // Channel ID where the message should be sent

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

let setupMessageId = null; // To store the message ID of the setup message
const cooldowns = new Map(); // To store the cooldown times for users
const cooldownTime = 5 * 60 * 1000; // 5 minutes in milliseconds

client.once('ready', async () => {
    console.log('Bot is ready!');

    const channel = client.channels.cache.get(channelId);

    if (!channel) {
        console.log('Specified channel not found');
        return;
    }

    // Fetch messages in the channel to check if the setup message already exists
    const messages = await channel.messages.fetch({ limit: 100 });
    const setupMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title === 'Sunucuda ne kadar süredir bulunduğunu öğren!');

    if (setupMessage) {
        console.log('Setup message already exists');
        setupMessageId = setupMessage.id; // Save the message ID
    } else {
        // Send the setup message if it doesn't exist
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Sunucuda ne kadar süredir bulunduğunu öğren!')
            .setDescription('Bu mesaja tepki vererek sunucuda ne kadar süredir bulunduğunuzu öğrenebilir ve uygun rolü alabilirsiniz.');

        const sentMessage = await channel.send({ embeds: [embed] });
        await sentMessage.react('⏳');
        setupMessageId = sentMessage.id; // Save the message ID
        console.log('Setup message sent');
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    const { guild } = reaction.message;

    if (reaction.emoji.name === '⏳' && reaction.message.id === setupMessageId) {
        const member = guild.members.cache.get(user.id);
        const now = Date.now();

        if (cooldowns.has(user.id)) {
            const lastReactionTime = cooldowns.get(user.id);
            const elapsed = now - lastReactionTime;

            if (elapsed < cooldownTime) {
                await reaction.users.remove(user.id);
                return;
            }
        }

        cooldowns.set(user.id, now);

        const joinedTimestamp = member.joinedTimestamp;
        const currentTimestamp = now;
        const duration = currentTimestamp - joinedTimestamp;

        const week = 7 * 24 * 60 * 60 * 1000;
        const month = 30 * 24 * 60 * 60 * 1000;
        const threeMonths = 3 * month;
        const sixMonths = 6 * month;
        const nineMonths = 9 * month;
        const year = 12 * month;
        const twoYears = 2 * year;

        const roles = {
            '1 Hafta': '1263867798254522498',
            '1 Ay': '1263867803354660945',
            '3 Ay': '1263867806533943321',
            '6 Ay': '1263867809612435536',
            '9 Ay': '1263867820207243335',
            '1 Yıl': '1263867824619913288',
            '2 Yıl': '1267964252757561354',
        };

        let roleToAdd;
        let roleName;
        if (duration >= twoYears) {
            roleToAdd = roles['2 Yıl'];
            roleName = '2 Yıl';
        } else if (duration >= year) {
            roleToAdd = roles['1 Yıl'];
            roleName = '1 Yıl';
        } else if (duration >= nineMonths) {
            roleToAdd = roles['9 Ay'];
            roleName = '9 Ay';
        } else if (duration >= sixMonths) {
            roleToAdd = roles['6 Ay'];
            roleName = '6 Ay';
        } else if (duration >= threeMonths) {
            roleToAdd = roles['3 Ay'];
            roleName = '3 Ay';
        } else if (duration >= month) {
            roleToAdd = roles['1 Ay'];
            roleName = '1 Ay';
        } else if (duration >= week) {
            roleToAdd = roles['1 Hafta'];
            roleName = '1 Hafta';
        } else {
            // Kullanıcının rol alma hakkı yoksa, kullanıcıya bilgi veren bir mesaj gönder
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`${user.username}, şu anda herhangi bir rol alma hakkın yok.`)
                .setDescription('Sunucuda daha fazla zaman geçirmen gerekiyor.');
            
            const channel = guild.channels.cache.get(channelId);
            const replyMessage = await channel.send({ embeds: [embed] });
            setTimeout(async () => {
                try {
                    await replyMessage.delete();
                } catch (error) {
                    console.log('Message already deleted');
                }
            }, 30000);

            await reaction.users.remove(user.id);
            return;
        }

        // Calculate the duration in days, hours, and minutes
        const days = Math.floor(duration / (24 * 60 * 60 * 1000));
        const hours = Math.floor((duration % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));

        // Calculate the time remaining for the next role
        let nextRoleDuration = 0;
        let nextRoleName = '';
        if (roleToAdd === roles['2 Yıl']) {
            nextRoleDuration = 0;
            nextRoleName = 'Rol yok';
        } else if (roleToAdd === roles['1 Yıl']) {
            nextRoleDuration = twoYears - duration;
            nextRoleName = '2 Yıl';
        } else if (roleToAdd === roles['9 Ay']) {
            nextRoleDuration = year - duration;
            nextRoleName = '1 Yıl';
        } else if (roleToAdd === roles['6 Ay']) {
            nextRoleDuration = nineMonths - duration;
            nextRoleName = '9 Ay';
        } else if (roleToAdd === roles['3 Ay']) {
            nextRoleDuration = sixMonths - duration;
            nextRoleName = '6 Ay';
        } else if (roleToAdd === roles['1 Ay']) {
            nextRoleDuration = threeMonths - duration;
            nextRoleName = '3 Ay';
        } else if (roleToAdd === roles['1 Hafta']) {
            nextRoleDuration = month - duration;
            nextRoleName = '1 Ay';
        }

        if (roleToAdd) {
            await member.roles.add(roleToAdd);

            // Remove old roles
            for (const role in roles) {
                if (roles[role] !== roleToAdd && member.roles.cache.has(roles[role])) {
                    await member.roles.remove(roles[role]);
                }
            }

            // Send a message to the specified channel and delete it after 30 seconds
            const nextRoleTime = nextRoleDuration > 0 ? `${Math.floor(nextRoleDuration / (24 * 60 * 60 * 1000))} gün ${Math.floor((nextRoleDuration % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))} saat ${Math.floor((nextRoleDuration % (60 * 60 * 1000)) / (60 * 1000))} dakika` : 'Rol yok';

            const embed = new EmbedBuilder()
                .setColor('#1aff00')
                .setTitle(`${user.username}, ${roleName} rolünü aldın Tebrikler!🎉`)
                .setDescription(`**Sunucuda Bulunduğunuz Süre:**\n${days} gün ${hours} saat ${minutes} dakika\n\n**Bir Sonraki Role Kalan Süre:**\n${nextRoleTime} (${nextRoleName})`);

            const channel = guild.channels.cache.get(channelId);
            const replyMessage = await channel.send({ embeds: [embed] });
            setTimeout(async () => {
                try {
                    await replyMessage.delete();
                } catch (error) {
                    console.log('Message already deleted');
                }
            }, 30000);

            // Remove the reaction
            await reaction.users.remove(user.id);
        }
    }
});

client.login(process.env.TOKEN)
