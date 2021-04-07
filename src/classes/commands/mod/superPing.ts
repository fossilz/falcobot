import { Message, TextChannel } from "discord.js";
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
            examples: ['superping @flamgo So many pings'],
            adminOnly: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;
        
        let target = Command.extractMemberMention(guild, args[0]) || guild.members.cache.get(args[0]);
        if (target !== undefined) {
            args.shift();
        } else {
            await commandExec.errorAsync('Invalid target');
            return;
        }

        const msgText = args.join(' ');

        guild.channels.cache.forEach(async (c) => {
            if (!(c instanceof TextChannel)) return;

            await c.send(`<@${target?.id}> ${msgText}`);
        });
        
        const commandlog = commandExec.getCommandLog();
        if (commandlog === null) return;
        
        commandlog.addField('Target', target, true);
        
        await commandExec.logAsync(commandlog);
    }
}

export default SuperPingCommand;