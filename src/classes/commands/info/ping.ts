import { Message, MessageEmbed } from "discord.js";
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

    run = async (message: Message, _: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const embed = new MessageEmbed()
            .setDescription('`Pinging...`')
            .setColor(commandExec.me.displayHexColor);  
        const msg = await commandExec.sendAsync(embed);
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
            .setFooter(commandExec.messageMember?.displayName || commandExec.messageAuthor.username,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        msg.edit(embed);

        await commandExec.logDefaultAsync();
    }
}

export default PingCommand;