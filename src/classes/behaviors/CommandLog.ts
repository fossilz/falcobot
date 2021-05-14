import { DMChannel, Guild, MessageEmbed, NewsChannel, TextChannel, User } from "discord.js";
import GuildCache from "../cache/GuildCache";

export default class CommandLog extends MessageEmbed {

    constructor(commandName: string, author: User, channel: TextChannel|NewsChannel|DMChannel, content: string){
        super();

        this
            .setAuthor(author.username, author.avatarURL() || undefined)
            .setDescription(`Used \`${commandName}\` command in <#${channel.id}>\n${content}`)
            .setTimestamp();
    }

    send = async (guild: Guild) => {
        if (guild.me === null){
            return;
        }
        const gModel = await GuildCache.GetGuildAsync(guild.id);
        const staffLogChannelID = gModel?.staffLogChannelID;
        if (staffLogChannelID === undefined || staffLogChannelID === null){
            return;
        }
        const logChannel = guild.channels.cache.get(staffLogChannelID);
        if (
            logChannel === undefined || 
            !(logChannel instanceof TextChannel) || 
            !logChannel.viewable || 
            !logChannel.permissionsFor(guild.me)?.has(['SEND_MESSAGES', 'EMBED_LINKS'])
        ){
            console.log('Cannot write to logChannel', logChannel);
            return;
        }

        logChannel.send(this);
    }
}