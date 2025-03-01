const Jimp = require("jimp");
const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const WELCOME_CHANNEL_ID = "1263995676237369404";

client.once("ready", () => {
  console.log(`✅ Bot ${client.user.tag} olarak giriş yaptı!`);
});
client.on("messageCreate", async (message) => {
  if (message.content === "!test") {
    const channel = message.channel;
    sendWelcomeMessage(channel, message.member);
  }
});
client.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (channel) sendWelcomeMessage(channel, member);
});

async function sendWelcomeMessage(channel, member) {
  try {
    const background = await Jimp.read("https://i.imgur.com/PhLjWzq.png"); // Arka plan
    const avatar = await Jimp.read(member.user.displayAvatarURL({ extension: "png", size: 256 })); // Kullanıcı avatarı
    
    // Resim Boyutlandırma
    background.resize(800, 300);
    avatar.resize(160, 160);
    avatar.circle(); // Yuvarlak avatar oluştur

    // Avatarı Ekle
    background.composite(avatar, 320, 50);

    // Yazı Ekleme
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    background.print(font, 280, 230, `Hos geldin, ${member.user.username}!`);

    // Resmi Buffer Olarak Al
    const buffer = await background.getBufferAsync(Jimp.MIME_PNG);
    const attachment = new AttachmentBuilder(buffer, { name: "welcome-image.png" });

    // Embed Mesajı
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Hoş geldin! 🎉")
      .setDescription(`Hoşgeldin ${member}!\nLütfen kurallar kanalını kontrol et.`)
      .setImage("attachment://welcome-image.png")
      .setFooter({ text: `🎉 Sunucuda ${member.guild.memberCount} kişi olduk!` });

    channel.send({ embeds: [embed], files: [attachment] });
  } catch (error) {
    console.error("Hoş geldin mesajı gönderilirken hata oluştu:", error);
  }
}

client.login(process.env.token);