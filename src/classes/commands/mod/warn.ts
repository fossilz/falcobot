import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const guild = commandExec.guild;
        const member = commandExec.messageMember;

        const memberArg = args.shift();
        if (memberArg === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        const target = Command.extractMemberMention(guild, memberArg) || guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(member, target);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            await commandExec.errorAsync(MemberComparer.FormatErrorForVerb(memberComparison, 'warn'));
            return;
        }
        if (target === undefined) {
            return;
        }

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        // Send a DM
        target.send(`You have been issued a warning in ${guild.name}: ${reason}`);
        
        const summary = await MemberNoteHelper.AddUserNote(guild.id, target.user.id, NoteType.Warn, reason, member);

        const warnEmbed = new MessageEmbed()
            .setTitle('Warn Member')
            .setDescription(`${target} was warned.`)
            .addField('Moderator', member, true)
            .addField('Member', target, true);
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
            .setFooter(member.displayName,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor);
        
        await commandExec.sendAsync(warnEmbed);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        
        if (target !== undefined) {
            commandLog.addField('Member', target, true);
        }
        if (reason) 
            commandLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await commandExec.logAsync(commandLog);
    }
}

export default WarnCommand;