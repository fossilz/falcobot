import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import { StaffLog } from "../../behaviors/StaffLog";
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

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const me = message.guild.me;
        const guild = message.guild;

        const mArg = args.shift();
        if (mArg === undefined) {
            this.error('Cannot find target.', executionParameters);
            return;
        }
        let memberId = this.extractMemberIDFromMention(mArg) || mArg;
        const memberMatches = await MemberFinder.FindMember(guild, memberId);

        if (memberMatches.length > 1) {
            // More than one member returned... ask for more detail
            const firstTenMembers = memberMatches.slice(0, 10);
            const matchEmbed = new MessageEmbed()
                .setTitle(`Members matching: ${args[0]} [${memberMatches.length}]`)
                .setTimestamp()
                .setDescription(firstTenMembers.map(x => MemberFinder.FormatMember(x)).join('\n') + ((memberMatches.length > 10) ? '\n... more ...' : ''));
            this.send(matchEmbed, executionParameters);
            return;
        }
        const gMember = memberMatches[0];
        const member = guild.members.cache.get(gMember?.user_id || memberId);

        let noteText = args.join(' ');

        if (noteText) {
            var memberComparison = MemberComparer.CheckMemberComparison(message.member, member);
            if (
                memberComparison != MemberComparisonResult.ValidTarget && 
                memberComparison != MemberComparisonResult.InvalidTarget &&  // We can add notes to users not on this server
                memberComparison != MemberComparisonResult.CannotTargetSelf // We can add notes to self
            ) {
                this.error(MemberComparer.FormatErrorForVerb(memberComparison, 'note'), executionParameters);
                return;
            }
            const summary = await MemberNoteHelper.AddUserNote(message.guild.id, gMember?.user_id || memberId, NoteType.Note, noteText, message.member);

            const noteEmbed = new MessageEmbed()
                .setTitle('Add Note to Member')
                .setDescription(`<@!${gMember?.user_id || memberId}> had a note added.`)
                .addField('Moderator', message.member, true)
                .addField('Member', member || memberId, true)
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
                .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setColor(me.displayHexColor);
            
            this.send(noteEmbed, executionParameters);

            const staffLog = StaffLog.FromCommand(this, message, executionParameters);
            if (staffLog === null) return;
            
            if (member !== undefined) {
                staffLog.addField('Member', member, true);
            } else {
                staffLog.addField('User ID', gMember?.user_id || memberId, true);
            }
            if (noteText) 
                staffLog.addField('Text', noteText, noteText === '`None`'); // If the reason isn't "None" give it its own line
            
            await staffLog.send();
        } else {
            const repo = await RepositoryFactory.getInstanceAsync();
            const noteList = await repo.MemberNotes.selectAllForUser(guild.id, gMember?.user_id || memberId);
            const embed = new MessageEmbed();
            if (gMember !== undefined) {
                embed
                    .setAuthor(`${gMember.user_name}#${gMember.user_discriminator}`, member?.user.avatarURL() || undefined);
            }
            embed
                .setDescription(`<@!${gMember?.user_id || memberId}> Notes [${noteList.length}]`)
                .setThumbnail(member?.user.avatarURL({ dynamic: true }) || '')
                .addField('Notes', noteList.length === 0 ? 'This user has no notes' : noteList.map(this.formatNote).join('\n'))
                .setFooter(gMember?.user_id || memberId)
                .setTimestamp()
                .setColor(member?.displayHexColor || message.guild.me.displayHexColor);
            this.send(embed, executionParameters);
        }
    }

    private formatNote = (note: MemberNoteModel): string => {
        const dt = new Date(note.timestamp);
        const ts = moment(dt);
        return `${ts.format('YYYY-MM-DD HH:mmZ')}${note.author_id === null ? '' : ' <@!' + note.author_id + '>'} **${note.type}** - ${note.text}`;
    }
}

export default NoteCommand;