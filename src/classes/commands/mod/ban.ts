import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import { NoteType } from "../../dataModels/MemberNoteModel";

class BanCommand extends Command {    
    constructor(){
        super({
            name: 'ban',
            category: 'mod',
            usage: 'ban <user mention/ID> [reason]',
            description: 'Bans a member from the server',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'BAN_MEMBERS'],
            defaultUserPermissions: ['BAN_MEMBERS'],
            examples: ['ban @flamgo spamming pings']
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        const member = message.member;
        if (guild.me === null) return;
        const staffLog = StaffLog.FromCommandContext(this, guild, message.author, message.channel, message.content, executionParameters);
        const me = guild.me;

        const memberArg = args.shift();
        if (memberArg === undefined) {
            Command.error('Cannot find target.', executionParameters);
            return;
        }
        const target = Command.extractMemberMention(guild, memberArg) || guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(member, target);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            Command.error(MemberComparer.FormatErrorForVerb(memberComparison, 'ban'), executionParameters);
            return;
        }
        if (target === undefined) {
            Command.error('Cannot find target.', executionParameters);
            return;
        }
        if (!target.bannable) {
            Command.error('That target is not bannable.', executionParameters);
            return;
        }

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await target.ban({ reason: reason });

        // We don't need the summary from this, they're being banned
        await MemberNoteHelper.AddUserNote(target.guild.id, target.user.id, NoteType.Ban, reason, member);

        const banEmbed = new MessageEmbed()
            .setTitle('Ban Member')
            .setDescription(`${target} was successfully banned.`)
            .addField('Moderator', member, true)
            .addField('Member', target, true);
        if (reason !== '`None`') {
            banEmbed.addField('Reason', reason);
        }
        banEmbed            
            .setFooter(member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        Command.send(banEmbed, executionParameters);

        if (staffLog === null) return;
        
        if (target !== undefined) {
            staffLog.addField('Member', target, true);
        }
        if (reason) 
            staffLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await staffLog.send();
    }
}

export default BanCommand;