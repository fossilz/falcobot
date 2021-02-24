import { Message, MessageEmbed } from "discord.js";
import { LogType, StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";

class AvatarCommand extends Command {
    constructor(){
        super({
            name: 'avatar',
            usage: 'avatar [user mention/ID]',
            description: 'Displays a user\'s avatar',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['avatar @Tyler'],
            logByDefault: false
        });
    }

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const member = this.extractMemberMention(message, args[0]) || message.guild.members.cache.get(args[0]) || message.member;
        
        const embed = new MessageEmbed()
            .setTitle(`${member.displayName}'s Avatar`)
            .setImage(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(member.displayHexColor);
        message.channel.send(embed);

        const staffLog = new StaffLog("Action: Avatar")
            .addField('User', message.member, true)
            .addField('Target', member);

        await staffLog.send(message.guild, LogType.Command, this.name);
    }
}

export default AvatarCommand;