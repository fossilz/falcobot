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
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            defaultUserPermissions: ['MANAGE_ROLES'],
            examples: ['mute @fossilz 30s', 'mute @flamgo 30m Oh the sweet sound of silence']
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        const member = message.member;
        if (guild.me === null) return;
        const staffLog = StaffLog.FromCommandContext(this, guild, message.author, message.channel, message.content, executionParameters);
        const me = guild.me;

        var repo = await RepositoryFactory.getInstanceAsync();
        var guildModel = await repo.Guilds.select(guild.id);

        if (guildModel === undefined || guildModel.muteRoleID === null) {
            Command.error('Mute role is not properly configured.', executionParameters);
            return;
        }
        var tryMuteRole = guild.roles.cache.get(guildModel.muteRoleID);
        if (tryMuteRole === undefined) {
            Command.error('Mute role is not properly configured.', executionParameters);
            return;
        }
        const muteRole = tryMuteRole;
        
        const memberArg = args.shift();
        if (memberArg === undefined) {
            Command.error('Cannot find target.', executionParameters);
            return;
        }
        const target = Command.extractMemberMention(guild, memberArg) || guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(member, target);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            Command.error(MemberComparer.FormatErrorForVerb(memberComparison, 'mute'), executionParameters);
            return;
        }
        if (target === undefined) {
            Command.error('Cannot find target.', executionParameters);
            return;
        }
        if (target.roles.cache.get(guildModel.muteRoleID)){
            Command.send('Target is already muted.', executionParameters);
            return;
        }

        const timeSpan = TimeParser.ParseTimeArgument(args[0]);
        if (timeSpan !== null) {
            args.shift();
        }

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        if (!await MemberRoleHelper.TryAssignRole(target, muteRole)) {
            Command.error('Error attempting to mute target.', executionParameters);
            return;
        }
        
        const summary = await MemberNoteHelper.AddUserNote(target.guild.id, target.user.id, NoteType.Mute, reason, member);

        const description = (timeSpan?.totalMilliseconds || 0) > 0 ? `${target} has now been muted for **${timeSpan?.toString()}**.` : `${target} has now been muted`;

        const muteEmbed = new MessageEmbed()
            .setTitle('Mute Member')
            .setDescription(description)
            .addField('Moderator', member, true)
            .addField('Member', target, true);
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
            .setFooter(member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        Command.send(muteEmbed, executionParameters);

        if (timeSpan !== null && timeSpan.totalMilliseconds > 0) {
            message.client.setTimeout(async () => {

                if (!await MemberRoleHelper.TryRemoveRole(target, muteRole)) {
                    Command.error('Error attempting to unmute target.', executionParameters);
                    return;
                }
                const unmuteEmbed = new MessageEmbed()
                    .setTitle('Unmute Member')
                    .setDescription(`${target} has been unmuted.`)
                    .setTimestamp()
                    .setColor(me.displayHexColor);
                Command.send(unmuteEmbed, executionParameters);

                const staffLog = StaffLog.FromCommand(this, message, executionParameters);
                if (staffLog === null) return;
                staffLog.setDescription('Automatic unmute');
                if (target !== undefined){
                    staffLog.addField('Member', target, true);
                }
                await staffLog.send();
                
            }, timeSpan.totalMilliseconds);
        }

        if (staffLog === null) return;
        
        if (target !== undefined){
            staffLog.addField('Member', target, true);
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