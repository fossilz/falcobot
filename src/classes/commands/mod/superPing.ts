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
        const guild = message.guild;
        if (guild.me === null) return;
        const staffLog = StaffLog.FromCommandContext(this, guild, message.author, message.channel, message.content, executionParameters);
        
        let target = Command.extractMemberMention(guild, args[0]) || guild.members.cache.get(args[0]);
        if (target !== undefined) {
            args.shift();
        } else {
            Command.error('Invalid target', executionParameters);
            return;
        }

        const msgText = args.join(' ');

        guild.channels.cache.forEach(async (c) => {
            if (!(c instanceof TextChannel)) return;

            await c.send(`<@${target?.id}> ${msgText}`);
        });
        
        if (staffLog === null) return;
        
        staffLog.addField('Target', target, true);
        
        await staffLog.send();
    }
}

export default SuperPingCommand;