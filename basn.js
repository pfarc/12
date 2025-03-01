const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Konfigürasyon
const LOG_CHANNEL_ID = "1340652921410289755"; // Bildirim kanalı
const bannedFile = "bannedc.json";

// Yasaklı kullanıcıları yükle
const getBannedUsers = () => {
    try {
        const data = fs.readFileSync(bannedFile, "utf8");
        const parsedData = JSON.parse(data);
        return Array.isArray(parsedData) ? parsedData : [];
    } catch (err) {
        console.error("Banned listesi okunamadı:", err);
        return [];
    }
};

// Kullanıcı mesaj gönderirse kontrol eder
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    const bannedUsers = getBannedUsers();
    
    if (bannedUsers.includes(message.author.id)) {
        await message.delete().catch(() => {});
        await applyTimeout(message.member);
        await sendLog(message.member);
    }
});

// Log kanalına mesaj gönderme fonksiyonu
async function sendLog(member) {
    const logChannel = await member.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    
    if (!logChannel) {
        console.log("Log kanalı bulunamadı veya erişim yok!");
        return;
    }

    if (!logChannel.permissionsFor(client.user).has("SendMessages")) {
        console.log("Bota log kanalına mesaj atma izni verilmemiş!");
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle("Yasaklı Kullanıcı Mesaj Attı!")
        .setColor(0xFF0000)
        .setDescription(`⚠️ **${member.user.tag}** (${member.id}) yasaklılar listesinde bulunuyor ve mesaj attığı için işlem yapıldı.`)
        .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(console.error);
}

// Kullanıcıya timeout atma fonksiyonu
async function applyTimeout(member) {
    if (member.kickable) {
        try {
            const maxTimeout = 60 * 60 * 24 * 28 * 1000; // 28 gün (maksimum süre)
            await member.timeout(maxTimeout, "Yasaklı kullanıcı mesaj attı");
            console.log(`Timeout uygulandı: ${member.user.tag}`);
        } catch (err) {
            console.error(`Timeout uygulanamadı: ${member.user.tag}`, err);
        }
    }
}

// Bot başlatılıyor
client.once("ready", () => {
    console.log(`${client.user.tag} aktif!`);
});

client.login(process.env.token);