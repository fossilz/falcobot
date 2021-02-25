import { Guild } from "discord.js";
import GuildResolver from "../behaviors/GuildResolver";
import DiscordClient from "../DiscordClient";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "ready",
    handler: async (client: DiscordClient) => {
        console.log(`I am ready! Logged in as ${client.client.user?.tag}!`);
	    console.log(`Bot has started, with ${client.client.users.cache.size} users, in ${client.client.channels.cache.size} channels of ${client.client.guilds.cache.size} guilds.`); 

        client.client.generateInvite({ permissions: 'ADMINISTRATOR' })
        .then(link => {
            console.log(`Generated bot invite link: ${link}`);
        });

        client.client.guilds.cache.forEach(async (guild: Guild) => {
            await GuildResolver.ResolveGuild(guild);
        });

        client.emit('ready');
    }
};

export default handler;