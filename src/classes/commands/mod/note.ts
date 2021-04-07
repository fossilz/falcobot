import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import { MemberNoteModel, NoteType } from "../../dataModels/MemberNoteModel";
import RepositoryFactory from "../../RepositoryFactory";
import { MemberFinder } from "../../behaviors/MemberFinder";
import moment from "moment";

class NoteCommand extends Command {    
    constructor(){
        super({
            name: 'note',
            category: 'mod',
            usage: 'note <user mention/ID> [Note text]',
            description: 'Gets or adds notes for a member',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['KICK_MEMBERS'], // Not necessary, just default to people who can kick
            examples: ['note @fossilz', 'note @flamgo Loves to play roblox']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const guild = commandExec.guild;
        const member = commandExec.messageMember;

        const mArg = args.shift();
        if (mArg === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        let memberId = Command.extractMemberIDFromMention(mArg) || mArg;
        const memberMatches = await MemberFinder.FindMember(guild, memberId);

        if (memberMatches.length > 1) {
            // More than one member returned... ask for more detail
            const firstTenMembers = memberMatches.slice(0, 10);
            const matchEmbed = new MessageEmbed()
                .setTitle(`Members matching: ${args[0]} [${memberMatches.length}]`)
                .setTimestamp()
                .setDescription(firstTenMembers.map(x => MemberFinder.FormatMember(x)).join('\n') + ((memberMatches.length > 10) ? '\n... more ...' : ''));
                await commandExec.sendAsync(matchEmbed);
            return;
        }
        const gMember = memberMatches[0];
        const target = guild.members.cache.get(gMember?.user_id || memberId);

        let noteText = args.join(' ');

        if (noteText) {
            var memberComparison = MemberComparer.CheckMemberComparison(member, target);
            if (
                memberComparison != MemberComparisonResult.ValidTarget && 
                memberComparison != MemberComparisonResult.InvalidTarget &&  // We can add notes to users not on this server
                memberComparison != MemberComparisonResult.CannotTargetSelf // We can add notes to self
            ) {
                await commandExec.errorAsync(MemberComparer.FormatErrorForVerb(memberComparison, 'note'));
                return;
            }
            const summary = await MemberNoteHelper.AddUserNote(guild.id, gMember?.user_id || memberId, NoteType.Note, noteText, member);

            const noteEmbed = new MessageEmbed()
                .setTitle('Add Note to Member')
                .setDescription(`<@!${gMember?.user_id || memberId}> had a note added.`)
                .addField('Moderator', member, true)
                .addField('Member', target || memberId, true)
                .addField('Text', noteText);
            if (summary.totalNotes() > 1) {
                const noteList: string[] = [];
                if (summary.noteCount > 1) noteList.push(`${summary.noteCount - 1} note${summary.noteCount === 2 ? '' : 's'}`);
                if (summary.noteCount > 0) noteList.push(`${summary.noteCount} noteing${summary.noteCount === 1 ? '' : 's'}`);
                if (summary.muteCount > 0) noteList.push(`${summary.muteCount} mute${summary.muteCount === 1 ? '' : 's'}`);
                if (summary.kickCount > 0) noteList.push(`${summary.kickCount} kick${summary.kickCount === 1 ? '' : 's'}`);
                if (summary.banCount > 0) noteList.push(`${summary.banCount} ban${summary.banCount === 1 ? '' : 's'}`);
                noteEmbed.addField('Other notes', noteList.join('\n'));
            }
            noteEmbed            
                .setFooter(member.displayName,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setColor(commandExec.me.displayHexColor);
            
            await commandExec.sendAsync(noteEmbed);

            const commandLog = commandExec.getCommandLog();
            if (commandLog === null) return;
            
            if (target !== undefined) {
                commandLog.addField('Member', target, true);
            } else {
                commandLog.addField('User ID', gMember?.user_id || memberId, true);
            }
            if (noteText) 
                commandLog.addField('Text', noteText, noteText === '`None`'); // If the reason isn't "None" give it its own line
            
            await commandExec.logAsync(commandLog);
        } else {
            const repo = await RepositoryFactory.getInstanceAsync();
            const noteList = await repo.MemberNotes.selectAllForUser(guild.id, gMember?.user_id || memberId);
            const embed = new MessageEmbed();
            if (gMember !== undefined) {
                embed
                    .setAuthor(`${gMember.user_name}#${gMember.user_discriminator}`, target?.user.avatarURL() || undefined);
            }
            embed
                .setDescription(`<@!${gMember?.user_id || memberId}> Notes [${noteList.length}]`)
                .setThumbnail(target?.user.avatarURL({ dynamic: true }) || '')
                .addField('Notes', noteList.length === 0 ? 'This user has no notes' : noteList.map(NoteCommand.formatNote).join('\n'))
                .setFooter(gMember?.user_id || memberId)
                .setTimestamp()
                .setColor(target?.displayHexColor || commandExec.me.displayHexColor);
            await commandExec.sendAsync(embed);
        }
    }

    private static formatNote = (note: MemberNoteModel): string => {
        const dt = new Date(note.timestamp);
        const ts = moment(dt);
        return `${ts.format('YYYY-MM-DD HH:mmZ')}${note.author_id === null ? '' : ' <@!' + note.author_id + '>'} **${note.type}** - ${note.text}`;
    }
}

export default NoteCommand;