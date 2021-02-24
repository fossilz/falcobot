import { Collection, DMChannel, Message, TextChannel } from "discord.js";
import { LogType, StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";

class PurgeCommand extends Command {
    constructor(){
        super({
            name: 'purge',
            usage: 'purge [channel mention/ID] [user mention/ID] <message count> [reason]',
            description: 'Deletes up to 100 messages, with optional channel and user filters.',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_MESSAGES'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['purge 20', 'purge #general 20', 'purge @fossilz 99', 'purge #general @fossilz 99']
        });
    }

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null) return;
        let channel = this.extractChannelMention(message, args[0]) || message.guild.channels.cache.get(args[0]);
        if (channel !== undefined) {
            args.shift();
        } else {
            if (message.channel instanceof DMChannel) return;
            channel = message.channel;
        }
        if (channel === null || channel === undefined || !(channel instanceof TextChannel)) {
            return;
        }

        if (channel.type !== "text" || !channel.viewable) {
            // send error message
            return;
        }

        let member = this.extractMemberMention(message, args[0]) || message.guild.members.cache.get(args[0]);
        if (member !== undefined) {
            args.shift();
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) === true || !amount || amount < 0 || amount > 100) {
            // send error message
            return;
        }

        const myPermissions = channel.permissionsFor(message.guild.me);
        if (myPermissions === null || !myPermissions.has(['MANAGE_MESSAGES'])) {
            // send error message
            return;
        }

        let reason = args.slice(1).join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await message.delete();

        let messages: Collection<string,Message> | null = null;
        if (member !== undefined) {
            const memberId = member.id;
            messages = (await channel.messages.fetch({limit: amount})).filter(m=> m.member !== null && m.member.id === memberId);
        }

        channel.bulkDelete(messages || amount, true).then(messages => {
            const messageCount = messages.size;
            // TODO: output a message to chat
        });

        const staffLog = new StaffLog("Action: Purge")
            .addField('Moderator', message.member, true)
            .addField('Channel', channel);
        if (member !== undefined){
            staffLog
                .addField('Member', member)
                .addField('Found Messages', messages?.size);
        } else {
            staffLog.addField('Message Count', amount);
        }
        if (reason) 
            staffLog.addField('Reason', reason);

        await staffLog.send(message.guild, LogType.Command, this.name);
    }
}

export default PurgeCommand;