import { Message, MessageEmbed } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import { NoteType } from "../../dataModels/MemberNoteModel";

class UnbanCommand extends Command {    
    constructor(){
        super({
            name: 'unban',
            category: 'mod',
            usage: 'unban <user mention/ID> [reason]',
            description: 'Removes a member from server ban',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'BAN_MEMBERS'],
            defaultUserPermissions: ['BAN_MEMBERS'],
            examples: ['unban @flamgo Let him back in']
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
        const memberId = Command.extractMemberIDFromMention(memberArg) || memberArg;
        const bannedUsers = await guild.fetchBans();
        const user = bannedUsers.get(memberId)?.user;
        if (user === undefined) {
            Command.error('Cannot find target.', executionParameters);
            return;
        }

        let reason = args.join(' ');
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await guild.members.unban(user, reason);

        await MemberNoteHelper.AddUserNote(guild.id, user.id, NoteType.Ban, `Unbanned: ${reason}`, member);

        const unbanEmbed = new MessageEmbed()
            .setTitle('Unban Member')
            .setDescription(`${user.tag} was successfully unbanned.`)
            .addField('Moderator', member, true);
        if (reason) {
            unbanEmbed.addField('Reason', reason);
        }
        unbanEmbed            
            .setFooter(member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
            Command.send(unbanEmbed, executionParameters);

        if (staffLog === null) return;
        staffLog.addField('User', user.tag, true);
        if (reason) 
            staffLog.addField('Reason', reason); // If the reason isn't "None" give it its own line
        
        await staffLog.send();
    }
}

export default UnbanCommand;