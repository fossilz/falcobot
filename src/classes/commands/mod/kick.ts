import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import RepositoryFactory from "../../RepositoryFactory";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";

class KickCommand extends Command {    
    constructor(){
        super({
            name: 'kick',
            category: 'mod',
            usage: 'kick <user mention/ID> [reason]',
            description: 'Kicks a member from the server',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'KICK_MEMBERS'],
            defaultUserPermissions: ['KICK_MEMBERS'],
            examples: ['kick @flamgo']
        });
    }

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const me = message.guild.me;

        var repo = await RepositoryFactory.getInstanceAsync();
        var guild = await repo.Guilds.select(message.guild.id);

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

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await member.kick(reason);

        const kickEmbed = new MessageEmbed()
            .setTitle('Kick Member')
            .setDescription(`${member} was successfully kicked.`)
            .addField('Moderator', message.member, true)
            .addField('Member', member, true);
        if (reason !== '`None`') {
            kickEmbed.addField('Reason', reason);
        }
        kickEmbed            
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        // Possible refactor for command redirect channel
        message.channel.send(kickEmbed);

        const staffLog = StaffLog.FromCommand(this, message);
        if (staffLog === null) return;
        
        if (member !== undefined) {
            staffLog.addField('Member', member, true);
        }
        if (reason) 
            staffLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await staffLog.send();
    }
}

export default KickCommand;