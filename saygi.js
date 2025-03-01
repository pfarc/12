const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./saygi.db');
const fs = require('fs');
const defaultImageUrl = 'https://media.discordapp.net/attachments/1128963757100519424/1264962998594699414/HjfG.gif';

const getImageForUser = (userId) => {
  try {
    const userImages = JSON.parse(fs.readFileSync('./userImages.json', 'utf-8'));
    const imageUrl = userImages[userId];
    if (imageUrl) {
      return imageUrl;
    }
  } catch (err) {
    console.error('Error reading userImages.json:', err);
  }
  return defaultImageUrl;
};
// Define the role ID of the top user role
const TOP_USER_ROLE_ID = '1269047598803845214';
// Define the channel ID where the top user will be displayed
const TOP_USER_CHANNEL_ID = '1270429977640304650';
// Define the channel ID where logs will be sent
const LOG_CHANNEL_ID = '1263995676237369404';

// Veritabanı tablolarını oluşturma
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS saygi (user_id TEXT PRIMARY KEY, saygi_puani INTEGER DEFAULT 0, last_given INTEGER DEFAULT 0)");
  db.run("CREATE TABLE IF NOT EXISTS leaderboard_message (message_id TEXT, channel_id TEXT, timestamp INTEGER DEFAULT 0)");
});

const handleSaygiBanCommand = async (message) => {
  if (message.author.id !== message.guild.ownerId) {
    message.reply("Bu komutu yalnızca sunucu sahibi kullanabilir.");
    return;
  }

  const user = message.mentions.users.first();
  if (!user) {
    message.reply("Lütfen saygı puanlarını silmek istediğiniz kullanıcıyı etiketleyin.");
    return;
  }

  const userId = user.id;

  db.serialize(() => {
    db.get("SELECT * FROM saygi WHERE user_id = ?", [userId], (err, row) => {
      if (err) {
        console.error(err.message);
        message.reply("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        return;
      }

      if (row) {
        db.run("DELETE FROM saygi WHERE user_id = ?", [userId], function(err) {
          if (err) {
            console.error(err.message);
            message.reply("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
            return;
          }

          const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle("Kullanıcı Saygı Puanları Silindi")
              .setDescription(`<@${userId}> adlı kullanıcının tüm saygı puanları silindi.`)
              .setColor(0xFF0000);

            logChannel.send({ embeds: [embed] });
          }

          message.reply(`<@${userId}> adlı kullanıcının tüm saygı puanları başarıyla silindi.`);

          // Rolleri güncelle
          updateTopUserRole(message.guild);
        });
      } else {
        message.reply("Bu kullanıcının saygı puanı yok.");
      }
    });
  });
};


const handleSaygiDuzenleCommand = async (interaction) => {
  const imageUrl = interaction.options.getString('url');
  const userId = interaction.user.id;

  // Check if the URL is valid and starts with 'http'
  if (!imageUrl || !imageUrl.startsWith('http')) {
    await interaction.reply({ content: 'Geçerli bir URL girin.', ephemeral: true });
    return;
  }

  // Reject URLs that contain 'tenor.com'
  if (imageUrl.includes('tenor.com')) {
    await interaction.reply({ content: 'Tenor linkleri kabul edilmez. Lütfen geçerli bir resim URL\'si girin.', ephemeral: true });
    return;
  }

  let userImages = {};
  try {
    userImages = JSON.parse(fs.readFileSync('./userImages.json', 'utf-8'));
  } catch (err) {
    console.error('Error reading userImages.json:', err);
  }

  userImages[userId] = imageUrl;

  fs.writeFileSync('./userImages.json', JSON.stringify(userImages, null, 2));

  await interaction.reply({ content: 'Resim URL\'niz başarıyla güncellendi!', ephemeral: true });
};



const EXTRA_POINTS_ROLE_ID = '1257806701784993882';


const getRandomColor = () => {
  return Math.floor(Math.random() * 16777215);
};
// Function to generate a random color
const handleSaygiCommand = async (interaction) => {
  const args = interaction.options.getUser('kullanıcı');
  if (!args) {
    await interaction.reply("Lütfen saygı puanı vermek için bir kullanıcı seçin.");
    return;
  }

  const giverId = interaction.user.id;
  const receiverId = args.id;

  // Check if the target user is a bot
  if (args.bot) {
    const embed = new EmbedBuilder()
      .setTitle("Botlara Saygı Puanı Verilemez!")
      .setDescription("Bir bota saygı puanı veremezsiniz. Lütfen gerçek bir kullanıcı seçin.")
      .setColor(0xFF0000);

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (giverId === receiverId) {
    const embed = new EmbedBuilder()
      .setTitle("Hayır, hayır, hayır!")
      .setDescription("Kendine saygı puanı veremezsin! 🤣")
      .setColor(0xFF0000)
      .setImage('https://media.discordapp.net/attachments/1128963757100519424/1264964965375410267/200.gif?ex=669fc9ed&is=669e786d&hm=bb2bae859b68532fe9969883c884c1c845615087ec320200aeb0e0d05a668649&=');

    await interaction.reply({ embeds: [embed] });
    return;
  }

  const now = Date.now();
  const cooldown = 3 * 60 * 60 * 1000; // 3 saat

  await interaction.deferReply(); // Yanıtın gecikebileceğini bildir

  db.serialize(() => {
    db.run("INSERT OR IGNORE INTO saygi (user_id, saygi_puani, last_given) VALUES (?, 0, 0)", [giverId], function(err) {
      if (err) {
        console.error(err.message);
        interaction.followUp("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        return;
      }

      db.get("SELECT * FROM saygi WHERE user_id = ?", [giverId], (err, row) => {
        if (err) {
          console.error(err.message);
          interaction.followUp("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
          return;
        }

        if (row && (now - row.last_given < cooldown)) {
          const timeRemaining = cooldown - (now - row.last_given);
          const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
          const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
          interaction.followUp(`Saygı puanı vermek için ${hours} saat ${minutes} dakika beklemeniz gerekiyor.`);
          return;
        }

        db.run("INSERT OR IGNORE INTO saygi (user_id, saygi_puani, last_given) VALUES (?, 0, 0)", [receiverId], function(err) {
          if (err) {
            console.error(err.message);
            interaction.followUp("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
            return;
          }

          // Check if the receiver has the extra points role
          const receiverMember = interaction.guild.members.cache.get(receiverId);
          const extraPoints = receiverMember && receiverMember.roles.cache.has(EXTRA_POINTS_ROLE_ID) ? 4 : 1;

          db.run("UPDATE saygi SET saygi_puani = saygi_puani + ? WHERE user_id = ?", [extraPoints, receiverId], function(err) {
            if (err) {
              console.error(err.message);
              interaction.followUp("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
              return;
            }

            db.run("UPDATE saygi SET last_given = ? WHERE user_id = ?", [now, giverId], async function(err) {
              if (err) {
                console.error(err.message);
                interaction.followUp("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
                return;
              }

              db.get("SELECT saygi_puani FROM saygi WHERE user_id = ?", [receiverId], async (err, receiverRow) => {
                if (err) {
                  console.error(err.message);
                  interaction.followUp("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
                  return;
                }
                const imageUrl = getImageForUser(giverId);
                const embed = new EmbedBuilder()
                  .setTitle("Saygı Puanı Verildi!")
                  .setDescription(`<@${receiverId}> adlı kullanıcıya saygı puanı verdiniz!`)
                  .setColor(getRandomColor()) // Rastgele renk belirle.
                  .setImage(imageUrl)
                  .setFooter({ text: `${args.username} - Toplam Saygı Puanı: ${receiverRow.saygi_puani} puan` });

                await interaction.followUp({ embeds: [embed] });

                // Rolleri güncelle
                updateTopUserRole(interaction.guild);
              });
            });
          });
        });
      });
    });
  });
};



const handleSkorCommand = async (interaction) => {
  db.all("SELECT * FROM saygi ORDER BY saygi_puani DESC", async (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }

    if (rows.length === 0) {
      interaction.reply("Henüz kimseye saygı puanı verilmemiş.");
      return;
    }

    const guild = interaction.guild;
    const userRank = rows.findIndex(row => row.user_id === interaction.user.id) + 1;
    const userScore = rows.find(row => row.user_id === interaction.user.id)?.saygi_puani || 0;
    const topTen = rows.slice(0, 10);

    const medals = ['🥇', '🥈', '🥉'];
    const leaderboardPromises = topTen.map(async (row, index) => {
      let member = guild.members.cache.get(row.user_id);
      if (!member) {
        try {
          member = await guild.members.fetch(row.user_id);
        } catch (err) {
          console.error(`Failed to fetch member with ID ${row.user_id}:`, err);
        }
      }
      const memberName = member ? member.user.tag : `<@${row.user_id}>`;
      return `${medals[index] || ''} ${index + 1}. ${memberName} - ${row.saygi_puani} puan`;
    });

    const leaderboard = await Promise.all(leaderboardPromises);
    const leaderboardText = leaderboard.join('\n');

    const embed = new EmbedBuilder()
      .setTitle("Saygı Skor Tablosu")
      .setColor(0x00AE86)
      .setDescription(leaderboardText);

    if (userRank > 10) {
      embed.addFields(
        { name: 'Sizin Sıralamanız', value: `${userRank}. sıradasınız` },
        { name: 'Toplam Saygı Puanınız', value: `${userScore} puan` }
      );
    } else {
      embed.addFields(
        { name: 'Toplam Saygı Puanınız', value: `${userScore} puan` }
      );
    }

    await interaction.reply({ embeds: [embed] });

    // Update roles
    updateTopUserRole(interaction.guild);
  });
};

// Function to clean up respect points for members who have left the server
const cleanUpLeftMembers = async (guild) => {
  db.all("SELECT * FROM saygi", async (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }

    for (const row of rows) {
      const memberId = row.user_id;
      const member = await guild.members.fetch(memberId).catch(() => null);
      
      if (!member) {
        db.run("DELETE FROM saygi WHERE user_id = ?", [memberId], function(err) {
          if (err) {
            console.error(err.message);
            return;
          }

          // Log the deletion to the specified log channel
          const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle("Önceki Üye Silindi")
              .setDescription(`Kullanıcı: <@${memberId}>\nSaygı Puanı: ${row.saygi_puani}`)
              .setColor(0xFF0000);

            logChannel.send({ embeds: [embed] });
          }
        });
      }
    }
  });
};

// Function to update the top user role
const updateTopUserRole = async (guild) => {
  // Clean up left members before updating top user role
  await cleanUpLeftMembers(guild);

  db.all("SELECT * FROM saygi ORDER BY saygi_puani DESC", async (err, rows) => {
    if (err) {
      console.error(err.message);
      return;
    }

    if (rows.length === 0) {
      return;
    }

    const topUserId = rows[0].user_id;

    // Get the role
    const role = guild.roles.cache.get(TOP_USER_ROLE_ID);
    if (!role) {
      console.error('Role not found');
      return;
    }

    // Assign role to the top user and remove from others
    await Promise.all(guild.members.cache.map(async member => {
      if (member.roles.cache.has(TOP_USER_ROLE_ID) && member.id !== topUserId) {
        await member.roles.remove(TOP_USER_ROLE_ID);
      } else if (!member.roles.cache.has(TOP_USER_ROLE_ID) && member.id === topUserId) {
        await member.roles.add(TOP_USER_ROLE_ID);
      }
    }));

    // Update the leaderboard message
    updateLeaderboardMessage(guild, topUserId);
  });
};

// Function to update the leaderboard message
const updateLeaderboardMessage = async (guild, topUserId) => {
  db.get("SELECT * FROM leaderboard_message", async (err, row) => {
    if (err) {
      console.error(err.message);
      return;
    }

    const channel = guild.channels.cache.get(TOP_USER_CHANNEL_ID);
    if (!channel) {
      console.error('Channel not found');
      return;
    }

    let topUser = await guild.members.fetch(topUserId).catch(() => null);
    if (!topUser) {
      console.error('Top user not found');
      return;
    }

    const now = Date.now();
    const startTime = row ? new Date(row.timestamp) : now;
    const durationMs = now - startTime;
    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    const embed = new EmbedBuilder()
      .setTitle("🏆 En Saygılı Üye!")
      .setColor(0xFFD700)
      .setDescription(`Tebrikler <@${topUserId}>! Sen en saygılı üyesin! 👑`)
      .addFields(
        { name: 'Liderlik Süresi', value: `${durationDays} gün, ${durationHours} saat, ${durationMinutes} dakikadır lider!`, inline: true }
      )
      .setThumbnail(topUser.user.displayAvatarURL({ dynamic: true, format: 'png', size: 512 }))
      .setFooter({ text: "O7", iconURL: "https://media.discordapp.net/attachments/1128963757100519424/1272186143068258394/pngwing.com_1.png?ex=66ba0f2c&is=66b8bdac&hm=bebf4b42dff466b390d4185101620cf3b0c73513c496e755a5bb4b203edafc5b&=&format=webp&quality=lossless" })
      .setTimestamp();

    if (row) {
      const message = await channel.messages.fetch(row.message_id).catch(() => null);
      if (message) {
        await message.edit({ embeds: [embed] });
      } else {
        const newMessage = await channel.send({ embeds: [embed] });
        db.run("UPDATE leaderboard_message SET message_id = ?, timestamp = ? WHERE channel_id = ?", [newMessage.id, now, TOP_USER_CHANNEL_ID]);
      }
    } else {
      const newMessage = await channel.send({ embeds: [embed] });
      db.run("INSERT INTO leaderboard_message (message_id, channel_id, timestamp) VALUES (?, ?, ?)", [newMessage.id, TOP_USER_CHANNEL_ID, now]);
    }
  });
};


// Function to handle member leave
const handleMemberLeave = async (member) => {
  const userId = member.id;
  const guild = member.guild;

  db.serialize(() => {
    db.get("SELECT * FROM saygi WHERE user_id = ?", [userId], async (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row) {
        const { saygi_puani } = row;

        // Delete the user's respect points
        db.run("DELETE FROM saygi WHERE user_id = ?", [userId], function(err) {
          if (err) {
            console.error(err.message);
            return;
          }

          // Log the deletion to the specified log channel
          const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle("Üye Ayrıldı")
              .setDescription(`Kullanıcı: <@${userId}>\nSaygı Puanı: ${saygi_puani}`)
              .setColor(0xFF0000);

            logChannel.send({ embeds: [embed] });
          }

          // Update the top user role and leaderboard message
          updateTopUserRole(guild);
        });
      }
    });
  });
};

module.exports = { handleSaygiCommand, handleSkorCommand, handleMemberLeave, handleSaygiDuzenleCommand, handleSaygiBanCommand };
