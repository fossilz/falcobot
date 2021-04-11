import { GuildMember, Message, TextChannel } from "discord.js";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { SCREW_THIS_GUY } from "../../../config";
import { asyncForEach } from "../../utils/functions";

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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;
        if (commandExec.messageMember === null) return;
        if (commandExec.messageMember.id === SCREW_THIS_GUY) {
            await commandExec.errorAsync('Screw you, you can\'t use this command.');
        }
        const screwThisGuy = guild.members.cache.get(SCREW_THIS_GUY);
        let target: GuildMember|undefined = screwThisGuy;
        
        if (commandExec.messageMember.permissions.has('ADMINISTRATOR')) {
            target = Command.extractMemberMention(guild, args[0]) || guild.members.cache.get(args[0]);
            args.shift();
        }

        if (target === undefined) {
            await commandExec.errorAsync('Invalid target');
            return;
        }

        const msgText = args.join(' ');

        await asyncForEach(guild.channels.cache.array(), async (c) => {
            if (guild.me === null) return;
            if (c === undefined) return;
            if (!(c instanceof TextChannel)) return;
            if (!c.viewable) return;
            if (!c.permissionsFor(guild.me)?.has(['SEND_MESSAGES'])) return;

            try {
                await c.send(`<@${target?.id}> ${msgText}`);
            } catch (err) {
                console.log(err,'channel',c.name,c.id);
            }
        });
        
        const commandlog = commandExec.getCommandLog();
        if (commandlog === null) return;
        
        commandlog.addField('Target', target, true);
        
        await commandExec.logAsync(commandlog);
    }
}

export default SuperPingCommand;