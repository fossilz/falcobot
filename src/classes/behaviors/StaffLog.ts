import { DMChannel, Guild, Message, MessageEmbed, NewsChannel, TextChannel, User } from "discord.js";
import GuildCache from "../cache/GuildCache";
import { Command } from "../commands/Command";
import { CommandExecutionParameters } from "./CommandHandler";

export enum LogType {
    Command = 1,
    Event = 2
}

export class StaffLog extends MessageEmbed {
    private guild: Guild;
    private logType: LogType;
    private name: string;

    constructor(guild: Guild, logType: LogType, name: string) {
        super();

        this.guild = guild;
        this.logType = logType;
        this.name = name;
    }

    send = async () => {
        if (this.guild === undefined || this.guild === null || this.guild.me === null){
            return;
        }
        const gModel = await GuildCache.GetGuildAsync(this.guild.id);
        const staffLogChannelID = gModel?.staffLogChannelID;
        if (staffLogChannelID === undefined || staffLogChannelID === null){
            return;
        }
        const logChannel = this.guild.channels.cache.get(staffLogChannelID);
        if (
            logChannel === undefined || 
            !(logChannel instanceof TextChannel) || 
            !logChannel.viewable || 
            !logChannel.permissionsFor(this.guild.me)?.has(['SEND_MESSAGES', 'EMBED_LINKS'])
        ){
            return;
        }

        // TODO: Insert code here to enable/disable logging on commands/events
        //console.log(`Logging ${this.logType} ${this.name}`);

        logChannel.send(this);
    }

    public static FromCommand = (command: Command, message: Message, executionParameters?: CommandExecutionParameters) : StaffLog | null => {
        if (message.guild === null) return null;
        return StaffLog.FromCommandContext(command, message.guild, message.author, message.channel, message.content, executionParameters);
    }

    public static FromCommandContext = (command: Command, guild: Guild, author: User, channel: TextChannel|NewsChannel|DMChannel, content: string, executionParameters?: CommandExecutionParameters) : StaffLog | null => {
        if (executionParameters != undefined && !executionParameters.logUsage) return null;
        return new StaffLog(guild, LogType.Command, command.name)
        .setAuthor(author.username, author.avatarURL() || undefined)
        .setDescription(`Used \`${command.name}\` command in <#${channel.id}>\n${content}`);
    }
}