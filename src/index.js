require('dotenv').config();

const { Client } = require('eris');
const { Tail } = require('tail');

const { Rcon } = require('rcon-client');

class Bridge {
	constructor() {
		this.bot = new Client(process.env.TOKEN);
		this.tail = new Tail(process.env.LOG_PATH);
		this.rcon = new Rcon({ host: 'localhost', port: process.env.RCON_PORT, password: process.env.RCON_PASSWORD });

		this.tail.on('line', (data) => this.sendToDiscord(data));

		this.bot.on('ready', () => console.log(`${this.bot.user.username} ready in ${this.bot.guilds.size} guilds`));

		this.bot.on('messageCreate', async (event) => {
			if (!event.author || event.author.bot || !event.content.length || event.channel.id !== process.env.DISCORD_CHANNEL) return;

			if (event.author.id !== process.env.OWNER || !event.content.startsWith('!')) return this.sendToMinecraft(event);
			const args = event.content.split(' ');

			if (args[0] === '!whitelist') {
				switch (args[1]) {
					case 'add': {
						if (!args[2]) return this.bot.createMessage(event.channel.id, 'Please provide a username to whitelist.');
						const res = await this.rcon.send(`whitelist add ${args[2]}`);
						this.bot.createMessage(event.channel.id, res);
						break;
					}
					case 'remove': {
						if (!args[2]) return this.bot.createMessage(event.channel.id, 'Please provide a username to remove from the whitelist.');
						const res = await this.rcon.send(`whitelist remove ${args[2]}`);
						this.bot.createMessage(event.channel.id, res);
						break;
					}
					case 'list': {
						const res = await this.rcon.send(`whitelist list`);
						this.bot.createMessage(event.channel.id, res);
						break;
					}
				}
			}
		});

		this.bot.connect();
		this.rcon.connect();
	}

	sendToMinecraft(event) {
		this.rcon.send(`tellraw @a ["",{"text":"[","color":"white"},{"text":"Discord","color":"blue"},{"text":"] ${event.author.username}: ${event.content}","color":"white"}]`);
	}

	sendToDiscord(data) {
		const message = /.*\[net.minecraft\.server\.dedicated\.DedicatedServer\/\]: <.{3,16}> /;
		const joined = /.*\[net.minecraft\.server\.dedicated\.DedicatedServer\/\]: .{3,16} joined/;
		const left = /.*\[net.minecraft\.server\.dedicated\.DedicatedServer\/\]: .{3,16} left/;

		if (!joined.test(data) && !left.test(data) && !message.test(data)) return;
    
		const [, content] = data.split('[net.minecraft.server.dedicated.DedicatedServer/]: ');
    
		this.bot.createMessage(process.env.DISCORD_CHANNEL, {
			content,
			allowedMentions: {
				users: false,
				roles: false,
				everyone: false,
			},
		});
	}
}

module.exports = new Bridge();
