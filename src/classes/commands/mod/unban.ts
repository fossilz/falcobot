import { Message, MessageEmbed } from "discord.js";
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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const guild = commandExec.guild;
        const member = commandExec.messageMember;

        const memberArg = args.shift();
        if (memberArg === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        const memberId = Command.extractMemberIDFromMention(memberArg) || memberArg;
        const bannedUsers = await guild.fetchBans();
        const user = bannedUsers.get(memberId)?.user;
        if (user === undefined) {
            await commandExec.errorAsync('Cannot find target.');
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
            .setFooter(member.displayName, commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor);
        
            await commandExec.sendAsync(unbanEmbed);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('User', user.tag, true);
        if (reason) 
            commandLog.addField('Reason', reason); // If the reason isn't "None" give it its own line
        
        await commandExec.logAsync(commandLog);
    }
}

export default UnbanCommand;