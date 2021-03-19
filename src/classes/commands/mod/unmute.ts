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
            this.error(MemberComparer.FormatErrorForVerb(memberComparison, 'unmute'), executionParameters);
            return;
        }
        if (member === undefined) {
            this.error('Cannot find target.', executionParameters);
            return;
        }
        if (!member.roles.cache.get(guild.muteRoleID)){
            this.send('Target is not muted.', executionParameters);
            return;
        }

        let reason = args.join(' ');
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        if (!await MemberRoleHelper.TryRemoveRole(member, muteRole)) {
            this.error('Error attempting to unmute target.', executionParameters);
            return;
        }
        
        if (reason !== '') {
            await MemberNoteHelper.AddUserNote(member.guild.id, member.user.id, NoteType.Mute, `Unmuted: ${reason}`, message.member);
        }

        const unmuteEmbed = new MessageEmbed()
            .setTitle('Unmute Member')
            .setDescription(`${member} has been unmuted`)
            .addField('Moderator', message.member, true)
            .addField('Member', member, true);
        if (reason !== '') {
            unmuteEmbed.addField('Reason', reason);
        }
        unmuteEmbed            
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        this.send(unmuteEmbed, executionParameters);

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        
        if (member !== undefined){
            staffLog.addField('Member', member, true);
        }
        if (reason) 
            staffLog.addField('Reason', reason);
        
        await staffLog.send();
    }
}

export default UnmuteCommand;