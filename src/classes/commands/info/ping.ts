import { Message, MessageEmbed } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class PingCommand extends Command {
    constructor(){
        super({
            name: 'ping',
            category: 'info',
            usage: 'ping',
            description: 'Gets bot\'s current latency',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            logByDefault: false
        });
    }

    run = async (message: Message, _: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        if (guild.me === null) return;
        const staffLog = StaffLog.FromCommandContext(this, guild, message.author, message.channel, message.content, executionParameters);

        const embed = new MessageEmbed()
            .setDescription('`Pinging...`')
            .setColor(guild.me.displayHexColor);  
        const msg = await Command.send(embed, executionParameters);
        if (msg === undefined) {
            return;
        }
        const timestamp = (message.editedTimestamp) ? message.editedTimestamp : message.createdTimestamp; // Check if edited
        const latency = `\`\`\`ini\n[ ${Math.floor(msg.createdTimestamp - timestamp)}ms ]\`\`\``;
        const apiLatency = `\`\`\`ini\n[ ${Math.round(message.client.ws.ping)}ms ]\`\`\``;
        
        embed.setTitle(`Pong!`)
            .setDescription('')
            .addField('Latency', latency, true)
            .addField('API Latency', apiLatency, true)
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        msg.edit(embed);

        await staffLog?.send();
    }
}

export default PingCommand;