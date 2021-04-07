import { Message, MessageEmbed } from "discord.js";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { Command } from "../Command";

class AvatarCommand extends Command {
    constructor(){
        super({
            name: 'avatar',
            category: 'info',
            usage: 'avatar [user mention/ID]',
            description: 'Displays a user\'s avatar',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['avatar @Tyler'],
            logByDefault: false,
            aliases: ['av']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;
        
        const member = Command.extractMemberMention(guild, args[0]) || guild.members.cache.get(args[0]) || commandExec.messageMember;
        if(member === null) return;
        
        const embed = new MessageEmbed()
            .setTitle(`${member.displayName}'s Avatar`)
            .setImage(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter(commandExec.messageMember?.displayName || commandExec.messageAuthor.username,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(member.displayHexColor);
        await commandExec.sendAsync(embed);

        await commandExec.logDefaultAsync();
    }
}

export default AvatarCommand;