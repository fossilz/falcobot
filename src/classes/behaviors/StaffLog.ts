import { Guild, Message, MessageEmbed, TextChannel } from "discord.js";
import { Command } from "../commands/Command";
import RepositoryFactory from "../RepositoryFactory";
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
        const repo = await RepositoryFactory.getInstanceAsync();
        const gModel = await repo.Guilds.select(this.guild.id);
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
        if (executionParameters != undefined && !executionParameters.logUsage) return null;
        return new StaffLog(message.guild, LogType.Command, command.name)
            .setAuthor(message.author.username, message.author.avatarURL() || undefined)
            .setDescription(`Used \`${command.name}\` command in <#${message.channel.id}>\n${message.content}`);
    }
}