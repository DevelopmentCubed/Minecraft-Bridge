require('dotenv').config();

const { Client } = require('eris');
const { Tail } = require('tail');

const { Rcon } = require('rcon-client');

class Bridge {
	constructor() {
		this.bot = new Client(process.env.TOKEN);
		this.tail = new Tail(process.env.LOG_PATH);
		this.rcon = new Rcon({ host: 'localhost', port: process.env.RCON_PORT, password: process.env.RCON_PASSWORD });
		this.rcon.on('connect', () => console.log(`[RCON] Connecting to port ${process.env.RCON_PORT}`));

		this.rcon.on('authenticated', () => console.log(`[RCON] Connected to port ${process.env.RCON_PORT}`));

		this.rcon.on('end', () => {
			console.log('[RCON] Connection lost, attempting to reconnect in 5 seconds...');
			setTimeout(() => {
				this.rcon.connect();
			}, 5000);
		});

		this.rcon.on('error', (error) => console.log(`[RCON] An error has occurred: ${error}`));

		this.tail.on('line', (data) => this.sendToDiscord(data));

		this.tail.on('error', (error) => console.log(`[TAIL] An error has occurred: ${error}`));

		this.bot.on('ready', () => console.log(`\n[DISCORD] ${this.bot.user.username} ready in ${this.bot.guilds.size} guilds\n`));

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
		const stopping = /INFO\].*: Stopping the server/g;
		const started = /INFO\].*: Done \(.*\)! For help, type "help"/g;

		const message = /INFO\].*: <.{3,16}> .*/g;
		const joined = /INFO\].*: .{3,16}\[.*\] logged in/g;
		const left = /INFO\].*: .{3,16} lost connection/g;

		if (data.match(started)?.length) {
			console.log('Server has started.');
			if (!this.rcon.authenticated)
				setTimeout(() => {
					this.rcon.connect();
				}, 2000);
			return this.bot.createMessage(process.env.DISCORD_CHANNEL, '✅ Server has started.').catch(console.error);
		}
		if (data.match(stopping)?.length) return this.bot.createMessage(process.env.DISCORD_CHANNEL, '🛑 Server is stopping.');

		if (data.match(message)?.length) {
			const [username] = data.match(/<.{3,16}>/);
			const [, content] = data.split(username);

			return this.bot.createMessage(process.env.DISCORD_CHANNEL, {
				content: username + content.replace('\u001b[m',''), // Spigot nonsense
				allowedMentions: {
					users: false,
					roles: false,
					everyone: false,
				},
			});
		}

		if (data.match(joined)?.length) {
			const [username] = data.match(/.{3,16}\[\//);
			return this.bot.createMessage(process.env.DISCORD_CHANNEL, {
				content: `${username.replace(/\[\//g, '')} joined the game`,
				allowedMentions: {
					users: false,
					roles: false,
					everyone: false,
				},
			});
		}

		if (data.match(left)?.length) {
			const [username] = data.match(/.{3,16} lost/);
			return this.bot.createMessage(process.env.DISCORD_CHANNEL, {
				content: `${username.replace(' lost', '')} left the game`,
				allowedMentions: {
					users: false,
					roles: false,
					everyone: false,
				},
			});
		}
	}
}

module.exports = new Bridge();
