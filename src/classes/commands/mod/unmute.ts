import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import RepositoryFactory from "../../RepositoryFactory";
import { Command } from "../Command";
import { MemberRoleHelper } from '../../behaviors/MemberRoleHelper';
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import { NoteType } from "../../dataModels/MemberNoteModel";

class UnmuteCommand extends Command {
    constructor(){
        super({
            name: 'unmute',
            category: 'mod',
            usage: 'unmute <user mention/ID> [reason]',
            description: 'Unmutes the specified user',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            defaultUserPermissions: ['MANAGE_ROLES'],
            examples: ['unmute @flamgo He agreed to be quiet for a while']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
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
            await commandExec.errorAsync(MemberComparer.FormatErrorForVerb(memberComparison, 'unmute'));
            return;
        }
        if (target === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        if (!target.roles.cache.get(guildModel.muteRoleID)){
            await commandExec.sendAsync('Target is not muted.');
            return;
        }

        let reason = args.join(' ');
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        if (!await MemberRoleHelper.TryRemoveRole(target, muteRole)) {
            await commandExec.errorAsync('Error attempting to unmute target.');
            return;
        }
        
        if (reason !== '') {
            await MemberNoteHelper.AddUserNote(target.guild.id, target.user.id, NoteType.Mute, `Unmuted: ${reason}`, member);
        }

        const unmuteEmbed = new MessageEmbed()
            .setTitle('Unmute Member')
            .setDescription(`${target} has been unmuted`)
            .addField('Moderator', member, true)
            .addField('Member', target, true);
        if (reason !== '') {
            unmuteEmbed.addField('Reason', reason);
        }
        unmuteEmbed            
            .setFooter(member.displayName,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor);
        
        await commandExec.sendAsync(unmuteEmbed);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        
        if (target !== undefined){
            commandLog.addField('Member', target, true);
        }
        if (reason) 
            commandLog.addField('Reason', reason);
        
        await commandExec.logAsync(commandLog);
    }
}

export default UnmuteCommand;