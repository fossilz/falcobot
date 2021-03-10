import { Message, TextChannel } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class SuperPingCommand extends Command {
    constructor(){
        super({
            name: 'superping',
            category: 'mod',
            usage: 'superping <user mention/id> [message]',
            description: 'Pings the mentioned user on every channel with optional message',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['superping @flamgo So many pings']
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        
        let member = this.extractMemberMention(message, args[0]) || message.guild.members.cache.get(args[0]);
        if (member !== undefined) {
            args.shift();
        } else {
            this.error('Invalid target', executionParameters);
            return;
        }

        const msgText = args.join(' ');

        message.guild.channels.cache.forEach(async (c) => {
            if (!(c instanceof TextChannel)) return;

            await c.send(`<@${member?.id}> ${msgText}`);
        });
        
        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        
        staffLog.addField('Target', member, true);
        
        await staffLog.send();
    }
}

export default SuperPingCommand;