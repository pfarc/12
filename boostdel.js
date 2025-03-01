const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const fs = require('fs');
const cron = require('node-cron');
const boosterRoleId = '1083859074002727053'; // Booster rolünün ID'sini buraya ekleyin
const boosterSpecialRoles = [
  '1262532584894632060',
  '1264649544176767108',
  '1264649546626240552',
  '1263867827769708585',
  '1264649540896690206',
  '1263260817927831584',
  '1263867831288729642',
  '1264650457238999120',
  '1264649767393296394',
  '1264649602879979520',
  '1264650001372414075',
  '1267570655524556891',
  '1267570963306909838',
  '1267570841533812847',
  '1274054064648228864',
  '1267570904330928178',
  '1267569840382672999',
  '1262392038327062598',
  '1262435264119308370',
  '1262435237464506369',
  '1262435393559597148',
  '1262435436190761010',
  '1258458953956855860',
  '1258458969412866058',
  '1264889398697132086',
  '1278734431682691093',
  '1258458964841070734',
  '1278734424208441395',
  '1258458963179995228',
  '1278734429602447452',
  '1258458963939168256',
  '1278734419653558403',
  '1278734421532479550',
  '1258458961586163804'
];

client.once('ready', () => {
    console.log('Bot is ready!');
    checkBoosterRoles();
});

async function checkBoosterRoles() {
    const guild = client.guilds.cache.get('1083853598020096051'); // Sunucu ID'sini buraya ekleyin

    if (!guild) {
        console.error('Sunucu bulunamadı.');
        return;
    }

    try {
        // Tüm üyeleri getir
        const members = await guild.members.fetch();

        // Booster özel rollerine sahip üyeleri tespit et
        const membersWithBoosterSpecialRoles = members.filter(member =>
            boosterSpecialRoles.some(roleId => member.roles.cache.has(roleId))
        );

        // Tespit edilen üyeler üzerinde işlem yap
        membersWithBoosterSpecialRoles.forEach(member => {
            // Eğer üye booster değilse
            if (!member.roles.cache.has(boosterRoleId)) {
                // Booster özel rollerini kaldır
                boosterSpecialRoles.forEach(roleId => {
                    if (member.roles.cache.has(roleId)) {
                        member.roles.remove(roleId)
                            .then(() => console.log(`Removed ${roleId} from ${member.user.tag}`))
                            .catch(console.error);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Üyeler alınırken hata oluştu:', error);
    }
}

// Üye rollerini güncelleme olayını dinleyin
client.on('guildMemberUpdate', (oldMember, newMember) => {
    // Eğer üyenin booster rolü kaldırıldıysa
    if (oldMember.roles.cache.has(boosterRoleId) && !newMember.roles.cache.has(boosterRoleId)) {
        // Booster özel rollerini kaldır
        boosterSpecialRoles.forEach(roleId => {
            if (newMember.roles.cache.has(roleId)) {
                newMember.roles.remove(roleId)
                    .then(() => console.log(`Removed ${roleId} from ${newMember.user.tag}`))
                    .catch(console.error);
            }
        });
    }
});

function getUserImages() {
    const data = fs.readFileSync('./userImages.json', 'utf-8');
    return JSON.parse(data);
}

// userImages.json dosyasını yazma
function saveUserImages(data) {
    fs.writeFileSync('./userImages.json', JSON.stringify(data, null, 4));
}

// Kullanıcı ID'sini dosyadan silme
function removeUserImage(userId) {
    const userImages = getUserImages();
    
    if (userImages[userId]) {
        delete userImages[userId];
        saveUserImages(userImages);
        console.log(`Kullanıcı ${userId} verisi silindi.`);
    }
}

// Belirlenen rollerden birine sahip olup olmadığını kontrol et
function hasRole(member, requiredRoles) {
    return member.roles.cache.some(role => requiredRoles.includes(role.id));
}

// Sunucudaki kullanıcıları kontrol etme
async function checkAllUsers() {
    const guild = client.guilds.cache.get('1083853598020096051'); // Sunucu ID'sini buraya yaz
    const requiredRoles = ['1257804689639215186', '1083859074002727053'];  // Belirlediğin rol ID'leri

    const userImages = getUserImages();

    guild.members.fetch().then(members => {
        members.forEach(member => {
            const userId = member.id;

            // Eğer kullanıcı listede varsa ve belirtilen rollerden birine sahip değilse sil
            if (userImages[userId] && !hasRole(member, requiredRoles)) {
                removeUserImage(userId);
            }
        });
    });
}

// Bot her gün gece 12'de otomatik kontrol yapacak
cron.schedule('0 0 * * *', () => {
    console.log('Günlük kontrol başladı.');
    checkAllUsers();
});

// Kullanıcı sunucudan ayrıldığında tetiklenen olay
client.on('guildMemberRemove', (member) => {
    const userId = member.id;
    removeUserImage(userId);  // Kullanıcı ayrıldığında veriyi sil
});


client.login(process.env.TOKEN)
    .catch(error => {
        console.error('Bot giriş yaparken hata oluştu:', error);
    });
