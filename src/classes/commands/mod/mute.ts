import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import RepositoryFactory from "../../RepositoryFactory";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { TimeParser } from "../../behaviors/TimeParser";
import { MemberRoleHelper } from '../../behaviors/MemberRoleHelper';
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import { NoteType } from "../../dataModels/MemberNoteModel";

class MuteCommand extends Command {
    constructor(){
        super({
            name: 'mute',
            category: 'mod',
            usage: 'mute <user mention/ID> [time(#s|m|h|d)] [reason]',
            description: 'Mutes a user for specified amount of time (max 14 day)',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_MESSAGES'],
            defaultUserPermissions: ['MANAGE_ROLES'],
            examples: ['mute @fossilz 30s', 'mute @flamgo 30m Oh the sweet sound of silence']
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const me = message.guild.me;

        var repo = await RepositoryFactory.getInstanceAsync();
        var guild = await repo.Guilds.select(message.guild.id);

        if (guild === undefined || guild.muteRoleID === null) {
            this.error('Mute role is not properly configured.', executionParameters);
            return;
        }
        var tryMuteRole = message.guild.roles.cache.get(guild.muteRoleID);
        if (tryMuteRole === undefined) {
            this.error('Mute role is not properly configured.', executionParameters);
            return;
        }
        const muteRole = tryMuteRole;
        
        const memberArg = args.shift();
        if (memberArg === undefined) {
            this.error('Cannot find target.', executionParameters);
            return;
        }
        const member = this.extractMemberMention(message, memberArg) || message.guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(message.member, member);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            this.error(MemberComparer.FormatErrorForVerb(memberComparison, 'mute'), executionParameters);
            return;
        }
        if (member === undefined) {
            this.error('Cannot find target.', executionParameters);
            return;
        }
        if (member.roles.cache.get(guild.muteRoleID)){
            this.send('Target is already muted.', executionParameters);
            return;
        }

        const timeSpan = TimeParser.ParseTimeArgument(args[0]);
        if (timeSpan !== null) {
            args.shift();
        }

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        if (!await MemberRoleHelper.TryAssignRole(member, muteRole)) {
            this.error('Error attempting to mute target.', executionParameters);
            return;
        }
        
        const summary = await MemberNoteHelper.AddUserNote(member.guild.id, member.user.id, NoteType.Mute, reason, message.member);

        const description = (timeSpan?.totalMilliseconds || 0) > 0 ? `${member} has now been muted for **${timeSpan?.toString()}**.` : `${member} has now been muted`;

        const muteEmbed = new MessageEmbed()
            .setTitle('Mute Member')
            .setDescription(description)
            .addField('Moderator', message.member, true)
            .addField('Member', member, true);
        if ((timeSpan?.totalMilliseconds || 0) > 0) {
            muteEmbed.addField('Time', `\`${timeSpan?.toString()}\``, true);
        }
        if (reason !== '`None`') {
            muteEmbed.addField('Reason', reason);
        }
        if (summary.totalNotes() > 1) {
            const noteList: string[] = [];
            if (summary.noteCount > 0) noteList.push(`${summary.noteCount} note${summary.noteCount === 1 ? '' : 's'}`);
            if (summary.warnCount > 0) noteList.push(`${summary.warnCount} warning${summary.warnCount === 1 ? '' : 's'}`);
            if (summary.muteCount > 1) noteList.push(`${summary.muteCount - 1} mute${summary.muteCount === 2 ? '' : 's'}`);
            if (summary.kickCount > 0) noteList.push(`${summary.kickCount} kick${summary.kickCount === 1 ? '' : 's'}`);
            if (summary.banCount > 0) noteList.push(`${summary.banCount} ban${summary.banCount === 1 ? '' : 's'}`);
            muteEmbed.addField('Previous notes', noteList.join('\n'));
        }
        muteEmbed            
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        this.send(muteEmbed, executionParameters);

        if (timeSpan !== null && timeSpan.totalMilliseconds > 0) {
            message.client.setTimeout(async () => {
                if (!await MemberRoleHelper.TryRemoveRole(member, muteRole)) {
                    this.error('Error attempting to unmute target.', executionParameters);
                    return;
                }
                const unmuteEmbed = new MessageEmbed()
                    .setTitle('Unmute Member')
                    .setDescription(`${member} has been unmuted.`)
                    .setTimestamp()
                    .setColor(me.displayHexColor);
                this.send(unmuteEmbed, executionParameters);
                
            }, timeSpan.totalMilliseconds);
        }

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        
        if (member !== undefined){
            staffLog.addField('Member', member, true);
        }
        if (timeSpan !== null && timeSpan.totalMilliseconds > 0) {
            staffLog.addField('Time', timeSpan.toString(), true);
        }
        if (reason) 
            staffLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await staffLog.send();
    }
}

export default MuteCommand;