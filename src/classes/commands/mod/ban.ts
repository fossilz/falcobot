import { Message, MessageEmbed } from "discord.js";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import { NoteType } from "../../dataModels/MemberNoteModel";

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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const guild = commandExec.guild;
        const member = commandExec.messageMember;
        const me = commandExec.me;

        const memberArg = args.shift();
        if (memberArg === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        const target = Command.extractMemberMention(guild, memberArg) || guild.members.cache.get(memberArg);
        var memberComparison = MemberComparer.CheckMemberComparison(member, target);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            await commandExec.errorAsync(MemberComparer.FormatErrorForVerb(memberComparison, 'ban'));
            return;
        }
        if (target === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        if (!target.bannable) {
            await commandExec.errorAsync('That target is not bannable.');
            return;
        }

        let reason = args.join(' ');
        if (!reason) reason = '`None`';
        if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';

        await target.ban({ reason: reason });

        // We don't need the summary from this, they're being banned
        await MemberNoteHelper.AddUserNote(target.guild.id, target.user.id, NoteType.Ban, reason, member);

        const banEmbed = new MessageEmbed()
            .setTitle('Ban Member')
            .setDescription(`${target} was successfully banned.`)
            .addField('Moderator', member, true)
            .addField('Member', target, true);
        if (reason !== '`None`') {
            banEmbed.addField('Reason', reason);
        }
        banEmbed            
            .setFooter(member.displayName,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(me.displayHexColor);
        
        await commandExec.sendAsync(banEmbed);

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

export default BanCommand;