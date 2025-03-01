const { ActivityType } = require('discord.js');

module.exports = (client) => {
  const setRandomBoosterPresence = async () => {
    try {
      console.log('Attempting to set presence...');

      // Get the guild (server) where you want to change the presence
      const guild = await client.guilds.fetch('1083853598020096051');
      if (!guild) throw new Error('Guild not found');
      
      // Get the list of boosters (members with Nitro Boosting the server)
      const boosters = await guild.members.fetch();
      const boostersWithPremium = boosters.filter(member => member.premiumSince);
      if (boostersWithPremium.size === 0) throw new Error('No boosters found');
      
      // Select a random booster
      const randomBooster = boostersWithPremium.random();
      
      // Set presence to the selected booster's name with custom text
      const customText = `Booster: ${randomBooster.displayName}❤️`;

      await client.user.setPresence({
        activities: [
          {
            name: customText,
            type: ActivityType.Watching // Or any other activity type you prefer
          }
        ],
        status: 'online' // Or any other status you prefer
      });

      console.log(`Presence set to "${customText}" successfully`);
    } catch (error) {
      console.error('Error setting presence:', error);
    }
  };

  // Set an interval to change the presence every 10 minutes
  setInterval(setRandomBoosterPresence, 600000); // 600000 milliseconds = 10 minutes

  // Initial call to set presence immediately
  setRandomBoosterPresence();
};