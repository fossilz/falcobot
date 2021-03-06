import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import { NoteType } from "../../dataModels/MemberNoteModel";

class WarnCommand extends Command {    
    constructor(){
        super({
            name: 'warn',
            category: 'mod',
            usage: 'warn <user mention/ID> [reason]',
            description: 'Warns a member',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['KICK_MEMBERS'], // Not necessary, just default to people who can kick
            examples: ['warn @flamgo']
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const me = message.guild.me;

        const memberArg = args.shift();
        if (memberArg === undefined) {
            this.error('Cannot find target.', executionParameters);
            return;
        }
        const member = this.extractMemberMention(message, memberArg) || message.guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(message.member, member);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            this.error(MemberComparer.FormatErrorForVerb(memberComparison, 'warn'), executionParameters);
            return;
        }
        if (member === undefined) {
            return;
        }

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        // Send a DM
        member.send(`You have been issued a warning in ${message.guild.name}: ${reason}`);
        
        const summary = await MemberNoteHelper.AddUserNote(message.guild.id, member.user.id, NoteType.Warn, reason, message.member);

        const warnEmbed = new MessageEmbed()
            .setTitle('Warn Member')
            .setDescription(`${member} was warned.`)
            .addField('Moderator', message.member, true)
            .addField('Member', member, true);
        if (reason !== '`None`') {
            warnEmbed.addField('Reason', reason);
        }
        if (summary.totalNotes() > 1) {
            const noteList: string[] = [];
            if (summary.noteCount > 0) noteList.push(`${summary.noteCount} note${summary.noteCount === 1 ? '' : 's'}`);
            if (summary.warnCount > 1) noteList.push(`${summary.warnCount - 1} warning${summary.warnCount === 2 ? '' : 's'}`);
            if (summary.muteCount > 0) noteList.push(`${summary.muteCount} mute${summary.muteCount === 1 ? '' : 's'}`);
            if (summary.kickCount > 0) noteList.push(`${summary.kickCount} kick${summary.kickCount === 1 ? '' : 's'}`);
            if (summary.banCount > 0) noteList.push(`${summary.banCount} ban${summary.banCount === 1 ? '' : 's'}`);
            warnEmbed.addField('Previous notes', noteList.join('\n'));
        }
        warnEmbed            
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        this.send(warnEmbed, executionParameters);

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        
        if (member !== undefined) {
            staffLog.addField('Member', member, true);
        }
        if (reason) 
            staffLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await staffLog.send();
    }
}

export default WarnCommand;