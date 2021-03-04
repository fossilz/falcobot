import { Message, MessageEmbed } from "discord.js";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";

class MembersCommand extends Command {
    constructor(){
        super({
            name: 'members',
            category: 'info',
            usage: 'members',
            description: 'Displays server member counts',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            logByDefault: false
        });
    }

    run = async (message: Message, _: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        
        const members = message.guild.members.cache.array();
        const total = members.length;
        const online = members.filter((m) => m.presence.status === 'online').length;
        const offline =  members.filter((m) => m.presence.status === 'offline').length;
        const dnd =  members.filter((m) => m.presence.status === 'dnd').length;
        const afk =  members.filter((m) => m.presence.status === 'idle').length;
        
        const embed = new MessageEmbed()
            .setTitle(`Member Status [${total}]`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }) || '')
            .setDescription(`**Online:** \`${online}\` members\n**Busy:** \`${dnd}\` members\n**AFK:** \`${afk}\` members\n**Offline:** \`${offline}\` members`)
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(message.guild.me.displayHexColor);
        this.send(embed, executionParameters);

        await StaffLog.FromCommand(this, message, executionParameters)?.send();
    }
}

export default MembersCommand;