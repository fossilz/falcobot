import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import RepositoryFactory from "../../RepositoryFactory";
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

    run = async (message: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const guild = commandExec.guild;
        const member = commandExec.messageMember;

        var repo = await RepositoryFactory.getInstanceAsync();
        var guildModel = await repo.Guilds.select(guild.id);

        if (guildModel === undefined || guildModel.muteRoleID === null) {
            await commandExec.errorAsync('Mute role is not properly configured.');
            return;
        }
        var tryMuteRole = guild.roles.cache.get(guildModel.muteRoleID);
        if (tryMuteRole === undefined) {
            await commandExec.errorAsync('Mute role is not properly configured.');
            return;
        }
        const muteRole = tryMuteRole;
        
        const memberArg = args.shift();
        if (memberArg === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        const target = Command.extractMemberMention(guild, memberArg) || guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(member, target);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            await commandExec.errorAsync(MemberComparer.FormatErrorForVerb(memberComparison, 'mute'));
            return;
        }
        if (target === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        if (target.roles.cache.get(guildModel.muteRoleID)){
            await commandExec.sendAsync('Target is already muted.');
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
            await commandExec.errorAsync('Error attempting to mute target.');
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
            .setFooter(member.displayName,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor);
        
        await commandExec.sendAsync(muteEmbed);

        if (timeSpan !== null && timeSpan.totalMilliseconds > 0) {
            message.client.setTimeout(async () => {

                if (!await MemberRoleHelper.TryRemoveRole(target, muteRole)) {
                    await commandExec.errorAsync('Error attempting to unmute target.');
                    return;
                }
                const unmuteEmbed = new MessageEmbed()
                    .setTitle('Unmute Member')
                    .setDescription(`${target} has been unmuted.`)
                    .setTimestamp()
                    .setColor(commandExec.me.displayHexColor);
                await commandExec.sendAsync(unmuteEmbed);

                const commandLog = commandExec.getCommandLog();
                if (commandLog === null) return;
                commandLog.setDescription('Automatic unmute');
                if (target !== undefined){
                    commandLog.addField('Member', target, true);
                }
                await commandExec.logAsync(commandLog);
                
            }, timeSpan.totalMilliseconds);
        }

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        
        if (target !== undefined){
            commandLog.addField('Member', target, true);
        }
        if (timeSpan !== null && timeSpan.totalMilliseconds > 0) {
            commandLog.addField('Time', timeSpan.toString(), true);
        }
        if (reason) 
            commandLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await commandExec.logAsync(commandLog);
    }
}

export default MuteCommand;