import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import RepositoryFactory from "../../RepositoryFactory";
import { StaffLog } from "../../behaviors/StaffLog";
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
            Command.error(MemberComparer.FormatErrorForVerb(memberComparison, 'unmute'), executionParameters);
            return;
        }
        if (target === undefined) {
            Command.error('Cannot find target.', executionParameters);
            return;
        }
        if (!target.roles.cache.get(guildModel.muteRoleID)){
            Command.send('Target is not muted.', executionParameters);
            return;
        }

        let reason = args.join(' ');
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        if (!await MemberRoleHelper.TryRemoveRole(target, muteRole)) {
            Command.error('Error attempting to unmute target.', executionParameters);
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
            .setFooter(member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        Command.send(unmuteEmbed, executionParameters);

        if (staffLog === null) return;
        
        if (target !== undefined){
            staffLog.addField('Member', target, true);
        }
        if (reason) 
            staffLog.addField('Reason', reason);
        
        await staffLog.send();
    }
}

export default UnmuteCommand;