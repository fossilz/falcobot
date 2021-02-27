import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import RepositoryFactory from "../../RepositoryFactory";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { TimeParser } from "../../behaviors/TimeParser";
import { MemberRoleHelper } from '../../behaviors/MemberRoleHelper';

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

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const me = message.guild.me;

        var repo = await RepositoryFactory.getInstanceAsync();
        var guild = await repo.Guilds.select(message.guild.id);

        if (guild === undefined || guild.muteRoleID === null) {
            // Error message
            return;
        }
        var tryMuteRole = message.guild.roles.cache.get(guild.muteRoleID);
        if (tryMuteRole === undefined) {
            // Error message
            return;
        }
        const muteRole = tryMuteRole;
        
        const memberArg = args.shift();
        if (memberArg === undefined) {
            // Error message
            return;
        }
        const member = this.extractMemberMention(message, memberArg) || message.guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(message.member, member);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            // Error message
            console.log('failed member comparison:', memberComparison);
            return;
        }
        if (member === undefined) {
            return;
        }
        if (member.roles.cache.get(guild.muteRoleID)){
            // Error : already muted
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
            // Error
            return;
        }

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
        muteEmbed            
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        // Possible refactor for command redirect channel
        message.channel.send(muteEmbed);

        if (timeSpan !== null && timeSpan.totalMilliseconds > 0) {
            message.client.setTimeout(async () => {
                if (!await MemberRoleHelper.TryRemoveRole(member, muteRole)) {
                    // Error
                    return;
                }
                const unmuteEmbed = new MessageEmbed()
                    .setTitle('Unmute Member')
                    .setDescription(`${member} has been unmuted.`)
                    .setTimestamp()
                    .setColor(me.displayHexColor);
                message.channel.send(unmuteEmbed);
                
            }, timeSpan.totalMilliseconds);
        }

        const staffLog = StaffLog.FromCommand(this, message);
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