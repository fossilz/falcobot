import { Collection, DMChannel, GuildMember, Message, TextChannel } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class PurgeCommand extends Command {
    constructor(){
        super({
            name: 'purge',
            category: 'mod',
            usage: 'purge [channel mention/ID] [user mention/ID] <message count> [reason]',
            description: 'Deletes up to 100 messages, with optional channel and user filters.',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_MESSAGES'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['purge 20', 'purge #general 20', 'purge @fossilz 99', 'purge #general @fossilz 99']
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

        let member = this.extractMemberMention(message, args[0]) || message.guild.members.cache.get(args[0]);
        if (member !== undefined) {
            args.shift();
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) === true || !amount || amount < 0 || amount > 100) {
            this.error('Please specify a purge count (1-100)', executionParameters);
            return;
        }

        let reason = args.slice(1).join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        if (!this.canDelete(channel)) {
            this.error('Cannot delete messages in this channel', executionParameters);
            return;
        }

        // This check is required so that it doesn't interfere with the configurable suppress option
        if (message.deletable && !message.deleted) {
            try {
                await message.delete();
            } catch (err) {
                // just swallow this... obviously the source message has been deleted but we're not
                // reflecting that locally yet
            }
        }

        const deletedMessageCount = await PurgeCommand.bulkDelete(channel, member, amount);
        
        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        
        staffLog.addField('Channel', channel, true);
        if (member !== undefined){
            staffLog.addField('Member', member, true);
        }
        staffLog.addField('Deleted Count', deletedMessageCount, true);
        if (reason) 
            staffLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await staffLog.send();
    }

    public static bulkDelete = async (channel: TextChannel, member: GuildMember | undefined, amount: number) : Promise<number> => {
        let messages: Collection<string,Message> | null = null;
        if (member !== undefined) {
            const memberId = member.id;
            messages = (await channel.messages.fetch({limit: amount})).filter(m=> m.member !== null && m.member.id === memberId);
        }

        const deletedMessages = await channel.bulkDelete(messages || amount, true);

        return deletedMessages.size;
    }

    private canDelete = (channel: TextChannel): boolean => {
        if (channel.guild.me === null) {
            return false;
        }
        const myPermissions = channel.permissionsFor(channel.guild.me);
        if (myPermissions === null || !myPermissions.has(['MANAGE_MESSAGES'])) {
            return false;
        }
        return true;
    }
}

export default PurgeCommand;