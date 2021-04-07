import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const guild = commandExec.guild;
        const member = commandExec.messageMember;

        const memberArg = args.shift();
        if (memberArg === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        const target = Command.extractMemberMention(guild, memberArg) || guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(member, target);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            await commandExec.errorAsync(MemberComparer.FormatErrorForVerb(memberComparison, 'kick'));
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
            .setFooter(member.displayName,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor);
        
        await commandExec.sendAsync(kickEmbed);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        
        if (target !== undefined) {
            commandLog.addField('Member', target, true);
        }
        if (reason) 
            commandLog.addField('Reason', reason, reason === '`None`'); // If the reason isn't "None" give it its own line
        
        await commandExec.logAsync(commandLog);
    }
}

export default KickCommand;