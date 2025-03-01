const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});



const guildId = '1083853598020096051';
const channelId = '1257805256910307328';
const roleId = '1257806701784993882';
const adminRoleId = '1258029689755144193';
const dataFile = 'winners.json';
const kcFile = 'k23.json';

// Load winner data from JSON file
let winnersData = {
    winners: {},
    lastWinner: null,
};

if (fs.existsSync(dataFile)) {
    winnersData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    // Check for expired roles initially
    checkForExpiredRoles(guild, channel);

    const next11pm = new Date();
    next11pm.setHours(19, 0, 0, 0);

    if (Date.now() > next11pm.getTime()) {
        next11pm.setDate(next11pm.getDate() + 1);
    }

    const hoursUntilNext11pm = (next11pm - Date.now()) / (1000 * 60 * 60);
    console.log(`Çekiliş ${hoursUntilNext11pm.toFixed(2)} saat sonra başlayacak.`);

    // Schedule a cron job to run every day at 11 PM
    cron.schedule('0 19 * * *', async () => {
        await startGiveaway(channel, guild);
    });

    // Schedule a cron job to run every 15 minutes to check for expired roles
    cron.schedule('*/15 * * * *', async () => {
        await checkForExpiredRoles(guild, channel);
    });
});

client.on('messageCreate', async message => {
    if (message.content === '!gece' && message.member.roles.cache.has(adminRoleId)) {
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);
        await startGiveaway(channel, guild);
        message.reply('Çekiliş başlatıldı!');
    }
});

async function startGiveaway(channel, guild) {
    const embed = new EmbedBuilder()
        .setTitle("🎉 Gece'nin Şanslısı Çekilişi! 🎉")
        .setDescription("1 dakika içinde bu mesaja tepki vererek katılabilirsiniz.")
        .setColor(0x00AE86)
        .setTimestamp();

    const message = await channel.send({ embeds: [embed] });

    // Add a reaction to the message
    await message.react('🎉');

    // Wait for 1 minute
    setTimeout(async () => {
        const fetchedMessage = await channel.messages.fetch(message.id);
        const reactions = fetchedMessage.reactions.cache.get('🎉');

        if (!reactions) {
            return channel.send('Çekilişe kimse katılmadı.');
        }

        const users = await reactions.users.fetch();
        const participants = users.filter(user => !user.bot).map(user => user.id);

        if (participants.length === 0) {
            return channel.send('Çekilişe kimse katılmadı.');
        }

        // Filter out the last winner
        const eligibleParticipants = participants.filter(id => id !== winnersData.lastWinner);

        if (eligibleParticipants.length === 0) {
            return channel.send('Çekilişe katılan tek kişi, önceki kazanan olduğundan yeni bir kazanan yok.');
        }

        // Select a random participant
        const winnerId = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];
        const winner = await guild.members.fetch(winnerId);

        // Assign the role to the winner
        await winner.roles.add(roleId);

        // Save the winner's data with the expiration time (10 hours from now)
        const expireTime = Date.now() + 10 * 60 * 60 * 1000;
        winnersData.winners[winnerId] = expireTime;
        winnersData.lastWinner = winnerId;
        fs.writeFileSync(dataFile, JSON.stringify(winnersData, null, 2));

        // Update KC value in k23.json
        let kcData = {};
        if (fs.existsSync(kcFile)) {
            kcData = JSON.parse(fs.readFileSync(kcFile, 'utf8'));
        }

        if (!kcData[winnerId]) {
            kcData[winnerId] = { kc: 0 };
        }

        kcData[winnerId].kc += 1000;
        fs.writeFileSync(kcFile, JSON.stringify(kcData, null, 2));

        // Announce the winner
        const winnerEmbed = new EmbedBuilder()
            .setTitle("🎉 Tebrikler! 🎉")
            .setDescription(`Tebrikler <@${winnerId}>! Şanslısı oldun ve rolü kazandın!`)
            .addFields(
                { name: "Çekiliş Bilgileri", value: "Her gece 11'de yapılır ve 1 kişi kazanır." },
                { name: "Rolün Süresi", value: "10 saat" },
                { name: "Rolün Faydaları", value: "Role sahip olan kişiler en üstte gözükür, o role özel komutları kullanabilir, fotoğraf ve gif gönderme izine sahipler." }
            )
            .setImage('https://media.discordapp.net/attachments/1128963757100519424/1267102969304842250/sono-bisque-doll-wa-koi-wo-suru-fireworks.gif?ex=66a79119&is=66a63f99&hm=eee01811d78ed54464c9463e163dc3f7438912df7d995bed9a1dac6bf2d6459a&=')
            .setColor(0xFFD700)
            .setTimestamp();

        channel.send({ embeds: [winnerEmbed] });

        // Remove the role after 10 hours (handled by the 15-minute cron job)
    }, 60 * 1000); // 1 minute
}

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    if (reaction.message.channel.id === channelId && reaction.emoji.name === '🎉') {
        if (user.id === winnersData.lastWinner) {
            if (!winnersData.notifiedUsers) {
                winnersData.notifiedUsers = {};
            }
            if (!winnersData.notifiedUsers[user.id]) {
                winnersData.notifiedUsers[user.id] = true;
                reaction.message.channel.send(`<@${user.id}>, bir önceki gecenin şanslısı kazandığınız için tekrar katılamazsınız.`);
                fs.writeFileSync(dataFile, JSON.stringify(winnersData, null, 2));
            }
            reaction.users.remove(user);
        }
    }
});

async function checkForExpiredRoles(guild, channel) {
    const now = Date.now();
    for (const winnerId in winnersData.winners) {
        const expireTime = winnersData.winners[winnerId];
        if (now >= expireTime) {
            try {
                const member = await guild.members.fetch(winnerId);
                if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(roleId);
                    channel.send(`<@${winnerId}> rolün süresi doldu ve kaldırıldı.`);
                }
            } catch (error) {
                console.error(`Error removing role for user ${winnerId}:`, error);
            } finally {
                delete winnersData.winners[winnerId];
                fs.writeFileSync(dataFile, JSON.stringify(winnersData, null, 2));
            }
        }
    }
}

client.login(process.env.TOKEN)