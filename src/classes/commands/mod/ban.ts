import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class BanCommand extends Command {    
    constructor(){
        super({
            name: 'ban',
            category: 'mod',
            usage: 'ban <user mention/ID> [reason]',
            description: 'Bans a member from the server',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'BAN_MEMBERS'],
            defaultUserPermissions: ['BAN_MEMBERS'],
            examples: ['ban @flamgo spamming pings']
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const me = message.guild.me;

        const memberArg = args.shift();
        if (memberArg === undefined) {
            this.error('Cannot find target.', executionParameters);
            return;
        }
        const member = this.extractMemberMention(message, memberArg) || message.guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(message.member, member);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            this.error(MemberComparer.FormatErrorForVerb(memberComparison, 'ban'), executionParameters);
            return;
        }
        if (member === undefined) {
            this.error('Cannot find target.', executionParameters);
            return;
        }
        if (!member.bannable) {
            this.error('That target is not bannable.', executionParameters);
            return;
        }

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await member.ban({ reason: reason });

        const banEmbed = new MessageEmbed()
            .setTitle('Ban Member')
            .setDescription(`${member} was successfully banned.`)
            .addField('Moderator', message.member, true)
            .addField('Member', member, true);
        if (reason !== '`None`') {
            banEmbed.addField('Reason', reason);
        }
        banEmbed            
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        this.send(banEmbed, executionParameters);

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        
        if (member !== undefined) {
            staffLog.addField('Member', member, true);
        }
        if (reason) 
            staffLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await staffLog.send();
    }
}

export default BanCommand;