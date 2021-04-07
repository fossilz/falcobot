import { Message, MessageEmbed } from "discord.js";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
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

    run = async (_: Message, __: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;
        
        const members = guild.members.cache.array();
        const total = members.length;
        const online = members.filter((m) => m.presence.status === 'online').length;
        const offline =  members.filter((m) => m.presence.status === 'offline').length;
        const dnd =  members.filter((m) => m.presence.status === 'dnd').length;
        const afk =  members.filter((m) => m.presence.status === 'idle').length;
        
        const embed = new MessageEmbed()
            .setTitle(`Member Status [${total}]`)
            .setThumbnail(guild.iconURL({ dynamic: true }) || '')
            .setDescription(`**Online:** \`${online}\` members\n**Busy:** \`${dnd}\` members\n**AFK:** \`${afk}\` members\n**Offline:** \`${offline}\` members`)
            .setFooter(commandExec.messageMember?.displayName || commandExec.messageAuthor.username,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor);
        await commandExec.sendAsync(embed);

        await commandExec.logDefaultAsync();
    }
}

export default MembersCommand;