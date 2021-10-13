# Minecraft Bridge

Connects your Minecraft server to a Discord channel.
You can also manage the servers whitelist via the bot with `!whitelist add/remove/list`

# Server Compatibility 

Works with [Vanilla](https://www.minecraft.net/en-us/download/server), [Spigot](https://www.spigotmc.org/), [Paper](https://papermc.io/), and [Forge](https://minecraftforge.net) servers.

# Installation

1. Install the latest LTS version of [NodeJS](https://nodejs.org/)

2. `git clone https://github.com/DevelopmentCubed/Minecraft-Bridge.git`

3. `yarn install` or `npm install`

4. Rename `.env.example` to `.env` and fill in the variables

5. Run the bot with `yarn start` or `npm start`. Alternatively you can use something like [PM2](https://www.npmjs.com/package/pm2) to keep the bot running in the background.