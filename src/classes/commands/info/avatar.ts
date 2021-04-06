import { Message, MessageEmbed } from "discord.js";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { StaffLog } from "../../behaviors/StaffLog";
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

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        const msgMember = message.member;
        
        const staffLog = StaffLog.FromCommandContext(this, guild, message.author, message.channel, message.content, executionParameters);
        const member = Command.extractMemberMention(guild, args[0]) || guild.members.cache.get(args[0]) || msgMember;
        
        const embed = new MessageEmbed()
            .setTitle(`${member.displayName}'s Avatar`)
            .setImage(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter(msgMember.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(member.displayHexColor);
        Command.send(embed, executionParameters);

        await staffLog?.send();
    }
}

export default AvatarCommand;