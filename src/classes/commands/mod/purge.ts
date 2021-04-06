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
        const guild = message.guild;
        const channel = message.channel;
        if (guild.me === null) return;
        const staffLog = StaffLog.FromCommandContext(this, guild, message.author, channel, message.content, executionParameters);

        let targetChannel = Command.extractChannelMention(guild, args[0]) || guild.channels.cache.get(args[0]);
        if (targetChannel !== undefined) {
            args.shift();
        } else {
            if (channel instanceof DMChannel) return;
            targetChannel = channel;
        }
        if (targetChannel === null || targetChannel === undefined || !(targetChannel instanceof TextChannel)) {
            Command.error('Invalid channel.', executionParameters);
            return;
        }

        if (targetChannel.type !== "text" || !targetChannel.viewable) {
            Command.error('Invalid channel.', executionParameters);
            return;
        }

        let target = Command.extractMemberMention(guild, args[0]) || guild.members.cache.get(args[0]);
        if (target !== undefined) {
            args.shift();
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) === true || !amount || amount < 0 || amount > 100) {
            Command.error('Please specify a purge count (1-100)', executionParameters);
            return;
        }

        let reason = args.slice(1).join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        if (!PurgeCommand.canDelete(targetChannel)) {
            Command.error('Cannot delete messages in this channel', executionParameters);
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

        const deletedMessageCount = await PurgeCommand.bulkDelete(targetChannel, target, amount);
        
        if (staffLog === null) return;
        
        staffLog.addField('Channel', targetChannel, true);
        if (target !== undefined){
            staffLog.addField('Member', target, true);
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

    private static canDelete = (channel: TextChannel): boolean => {
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