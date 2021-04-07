import { DMChannel, Message, TextChannel } from "discord.js";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { TimeParser } from "../../behaviors/TimeParser";

class SlowmodeCommand extends Command {
    constructor(){
        super({
            name: 'slowmode',
            category: 'mod',
            usage: 'slowmode [channel mention/ID] <rate> [reason]',
            description: 'Enables slow mode on specified or current channel.  Max 6 hours.  Set to 0s to disable.',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_CHANNELS'],
            defaultUserPermissions: ['MANAGE_CHANNELS'],
            examples: ['slowmode #general 60s', 'slowmode 0s']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;
        const channel = commandExec.messageChannel;

        let targetChannel = Command.extractChannelMention(guild, args[0]) || guild.channels.cache.get(args[0]);
        if (targetChannel !== undefined) {
            args.shift();
        } else {
            if (channel instanceof DMChannel) return;
            targetChannel = channel;
        }
        if (targetChannel === null || targetChannel === undefined || !(targetChannel instanceof TextChannel)) {
            await commandExec.errorAsync('Invalid channel.');
            return;
        }

        if (targetChannel.type !== "text" || !targetChannel.viewable) {
            await commandExec.errorAsync('Invalid channel.');
            return;
        }

        const timeSpanArg = args.shift();
        const timeSpan = TimeParser.ParseTimeArgument(timeSpanArg);
        if (timeSpan === null || timeSpan.totalMilliseconds > 21600000) {
            await commandExec.errorAsync('Must specify rate between 0s and 6h.');
            return;
        }

        let reason = args.slice(1).join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await targetChannel.setRateLimitPerUser(timeSpan.totalMilliseconds / 1000, reason);
        
        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        
        commandLog.addField('Channel', targetChannel, true);
        commandLog.addField('Slowmode', timeSpan.totalMilliseconds > 0 ? 'Enabled' : 'Disabled', true);
        if (timeSpan.totalMilliseconds > 0){
            commandLog.addField('Rate', timeSpan.toString(), true);
        }
        if (reason !== '`None`') 
            commandLog.addField('Reason', reason);
        
        await commandExec.logAsync(commandLog);
    }
}

export default SlowmodeCommand;