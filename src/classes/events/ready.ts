import { Guild } from "discord.js";
import GuildResolver from "../behaviors/GuildResolver";
import { NewEggShuffleHandler } from "../behaviors/NewEggShuffleHandler";
import DiscordClient from "../DiscordClient";
import IEventHandler from "./IEventHandler";

const handler: IEventHandler = {
    eventName: "ready",
    handler: async (client: DiscordClient) => {
        const discord = client.client;
        console.log(`I am ready! Logged in as ${discord.user?.tag}!`);
	    console.log(`Bot has started, with ${discord.users.cache.size} users, in ${discord.channels.cache.size} channels of ${discord.guilds.cache.size} guilds.`); 

        discord.generateInvite({permissions: [
            'ADD_REACTIONS',
            'ATTACH_FILES',
            'BAN_MEMBERS',
            'CHANGE_NICKNAME',
            'CONNECT',
            'CREATE_INSTANT_INVITE',
            'DEAFEN_MEMBERS',
            'EMBED_LINKS',
            'KICK_MEMBERS',
            'MANAGE_CHANNELS',
            'MANAGE_EMOJIS',
            'MANAGE_GUILD',
            'MANAGE_MESSAGES',
            'MANAGE_NICKNAMES',
            'MANAGE_ROLES',
            'MANAGE_WEBHOOKS',
            'MENTION_EVERYONE',
            'MOVE_MEMBERS',
            'MUTE_MEMBERS',
            'PRIORITY_SPEAKER',
            'READ_MESSAGE_HISTORY',
            'SEND_MESSAGES',
            'SEND_TTS_MESSAGES',
            'SPEAK',
            'STREAM',
            'USE_EXTERNAL_EMOJIS',
            'VIEW_AUDIT_LOG',
            'VIEW_CHANNEL',
            'VIEW_GUILD_INSIGHTS'
        ]})
        .then(link => {
            console.log(`Generated bot invite link: ${link}`);
        });

        const guildSetupTasks = discord.guilds.cache.map(async (guild: Guild) => {
            await GuildResolver.ResolveGuild(client, guild);
        });
        await Promise.all(guildSetupTasks);

        NewEggShuffleHandler.setupShuffleListener();

        client.emit('ready');
    }
};

export default handler;