import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import { NoteType } from "../../dataModels/MemberNoteModel";

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

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        const member = message.member;
        if (guild.me === null) return;
        const staffLog = StaffLog.FromCommandContext(this, guild, message.author, message.channel, message.content, executionParameters);
        const me = guild.me;

        const memberArg = args.shift();
        if (memberArg === undefined) {
            Command.error('Cannot find target.', executionParameters);
            return;
        }
        const target = Command.extractMemberMention(guild, memberArg) || guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(member, target);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            Command.error(MemberComparer.FormatErrorForVerb(memberComparison, 'kick'), executionParameters);
            return;
        }
        if (target === undefined) {
            return;
        }

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await target.kick(reason);
        
        // We don't need the summary from this, they're being kicked
        await MemberNoteHelper.AddUserNote(target.guild.id, target.user.id, NoteType.Kick, reason, member);

        const kickEmbed = new MessageEmbed()
            .setTitle('Kick Member')
            .setDescription(`${target} was successfully kicked.`)
            .addField('Moderator', member, true)
            .addField('Member', target, true);
        if (reason !== '`None`') {
            kickEmbed.addField('Reason', reason);
        }
        kickEmbed            
            .setFooter(member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        Command.send(kickEmbed, executionParameters);

        if (staffLog === null) return;
        
        if (target !== undefined) {
            staffLog.addField('Member', target, true);
        }
        if (reason) 
            staffLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await staffLog.send();
    }
}

export default KickCommand;