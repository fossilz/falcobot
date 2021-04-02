import { DMChannel, Message, TextChannel } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
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

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null) return;
        let channel = this.extractChannelMention(message, args[0]) || message.guild.channels.cache.get(args[0]);
        if (channel !== undefined) {
            args.shift();
        } else {
            if (message.channel instanceof DMChannel) return;
            channel = message.channel;
        }
        if (channel === null || channel === undefined || !(channel instanceof TextChannel)) {
            this.error('Invalid channel.', executionParameters);
            return;
        }

        if (channel.type !== "text" || !channel.viewable) {
            this.error('Invalid channel.', executionParameters);
            return;
        }

        const timeSpanArg = args.shift();
        const timeSpan = TimeParser.ParseTimeArgument(timeSpanArg);
        if (timeSpan === null || timeSpan.totalMilliseconds > 21600000) {
            this.error('Must specify rate between 0s and 6h.', executionParameters);
            return;
        }

        let reason = args.slice(1).join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await channel.setRateLimitPerUser(timeSpan.totalMilliseconds / 1000, reason);
        
        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        
        staffLog.addField('Channel', channel, true);
        staffLog.addField('Slowmode', timeSpan.totalMilliseconds > 0 ? 'Enabled' : 'Disabled', true);
        if (timeSpan.totalMilliseconds > 0){
            staffLog.addField('Rate', timeSpan.toString(), true);
        }
        if (reason !== '`None`') 
            staffLog.addField('Reason', reason);
        
        await staffLog.send();
    }
}

export default SlowmodeCommand;