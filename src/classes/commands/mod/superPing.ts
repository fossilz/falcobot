import { Message, TextChannel } from "discord.js";
import { LogType, StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";

class SuperPingCommand extends Command {
    constructor(){
        super({
            name: 'superping',
            usage: 'superping <user mention/id> [message]',
            description: 'Pings the mentioned user on every channel with optional message',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['superping @flamgo So many pings']
        });
    }

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        
        let member = this.extractMemberMention(message, args[0]) || message.guild.members.cache.get(args[0]);
        if (member !== undefined) {
            args.shift();
        } else {
            // Error message - no user
            return;
        }

        const msgText = args.join(' ');

        message.guild.channels.cache.forEach(async (c) => {
            if (!(c instanceof TextChannel)) return;

            await c.send(`<@${member?.id}> ${msgText}`);
        });

        const staffLog = new StaffLog("Action: Super Ping")
            .addField('User', message.member, true)
            .addField('Target', member);
        if (msgText) {
            staffLog.addField('Message', msgText);
        }

        await staffLog.send(message.guild, LogType.Command, this.name);
    }
}

export default SuperPingCommand;