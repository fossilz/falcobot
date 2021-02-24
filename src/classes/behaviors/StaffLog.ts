import { Guild, MessageEmbed, TextChannel } from "discord.js";
import RepositoryFactory from "../RepositoryFactory";

export enum LogType {
    Command = 1,
    Event = 2
}

export class StaffLog {
    title: string;
    fields: StaffLogField[];
    footer: string|null;
    color: string|null;

    constructor(title: string){
        this.title = title;
        this.fields = [];
    }

    addField = (name: string, value: any, inline?: boolean):StaffLog =>{
        this.fields.push(new StaffLogField(name, value, inline));
        return this;
    }

    send = async (guild: Guild, logType: LogType, name: string) => {
        if (guild === undefined || guild === null || guild.me === null){
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const gModel = await repo.Guilds.select(guild.id);
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
            return;
        }

        // TODO: Insert code here to enable/disable logging on commands/events
        console.log(`Logging ${logType} ${name}`);

        const embed = new MessageEmbed()
            .setTitle(this.title)
            .setTimestamp();
        if (this.color !== null) {
            embed.setColor(this.color);
        }
        if (this.footer !== undefined && this.footer !== null) {
            embed.setFooter(this.footer);
        }
        this.fields.forEach((field)=>{
            embed.addField(field.name, field.value, field.inline);
        });
        logChannel.send(embed);
    }
}

class StaffLogField {
    name: string;
    value: any;
    inline: boolean;

    constructor(name: string, value: any, inline?: boolean){
        this.name = name;
        this.value = value;
        this.inline = inline || false;
    }
}