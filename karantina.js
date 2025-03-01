const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require("@discordjs/voice");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

const bannedWords = [
  "ambiti", "amcık", "amck", "amık", "amını", "amına", "amında", "amsalak", "dalyarak", "daşak", 
  "daşağı", "daşşak", "daşşağı", "domal", "fahişe", "folloş", "fuck", "gavat", "godoş",
  "hasiktir", "hassiktir", "ibne", "ipne", "kahpe", "kahbe", "kaltak", "kaltağ", "kancık", "kancığ", 
  "kavat", "kerane", "kerhane", "kevaşe", "mastırbasyon", "masturbasyon", "mastürbasyon", "orosbu", 
  "orospu", "orusbu", "oruspu", "orsp", "pezevenk", "pzvnk", "puşt", "qavat", "sakso", "sıçar", 
  "sıçayım", "sıçmak", "sıçsın", "sikem", "siker", "sikeyim", "sikici", "sikik", "sikim", "sikiş","sikme", "siktir", "sktr", "siktiği", "sokarım", "sokayım", "sürtük", "sperm", "taşak", 
  "taşağa", "taşağı", "taşşak", "taşşağa", "taşşağı", "allahını","vajina", "yalaka", "yarağ", "yarra", "yrrk"
];
 // Yasaklı kelimeleri buraya ekle
const logChannelId = "1340652921410289755"; // Log kanalının ID'sini buraya yaz
const timeoutDuration = 12 * 60 * 60 * 1000; // 12 saat
const monitorDuration = 60 * 60 * 1000; // 30 dakika

const newMembers = new Map();

client.on('guildMemberAdd', member => {
    newMembers.set(member.id, Date.now());
    setTimeout(() => newMembers.delete(member.id), monitorDuration);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !newMembers.has(message.author.id)) return;
    
    if (bannedWords.some(word => message.content.toLowerCase().includes(word))) {
        try {
            await message.delete();
            await message.member.timeout(timeoutDuration, "Yeni üyenin yasaklı kelime kullanması");
            
            await message.member.send("Moderasyon tarafından onaylanmayı bekliyorsunuz. Lütfen bekleyin.").catch(err => console.log("DM gönderilemedi: ", err));
            
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const roleMentions = `<@&1258030010082787339> <@&1257967305833320490>`; // Buraya etiketlemek istediğin rol ID'lerini ekleyebilirsin
                
                await logChannel.send({
                    content: `${roleMentions}`, // Rolleri embed dışında burada etiketliyoruz
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Yeni Üye Yasaklı Kelime Kullanımı")
                            .setColor("Red")
                            .setDescription(`**${message.author.tag}** kullanıcısı yasaklı kelime kullandığı için 12 saat zaman aşımına uğradı.`)
                            .addFields(
                                { name: "Kullanıcı", value: `<@${message.author.id}>`, inline: true },
                                { name: "Mesaj İçeriği", value: message.content, inline: false }
                            )
                            .setTimestamp()
                    ]
                });
            }
        } catch (error) {
            console.error("Hata oluştu: ", error);
        }
    }
});
const VOICE_CHANNEL_ID = "1283961969380032595"; // Ses kanalının ID'sini buraya yaz

client.once("ready", () => {
    console.log(`${client.user.tag} giriş yaptı!`);

    const channel = client.channels.cache.get(VOICE_CHANNEL_ID);
    if (!channel) return console.log("Ses kanalı bulunamadı!");

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
    });

    console.log("Ses kanalına bağlandı!");
});

client.login(process.env.TOKEN);
