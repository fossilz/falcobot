import { Message, MessageEmbed } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class MooCommand extends Command {
    constructor(){
        super({
            name: 'moo',
            category: 'admin',
            usage: 'moo',
            description: 'Moo',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['moo'],
            logByDefault: false
        });
    }

    run = async (message: Message, _: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;

        const embed = new MessageEmbed()
            .setTitle('Moo')
            .setImage("https://media.giphy.com/media/KSOb453X3WPRu/giphy.gif")
            .setFooter("Mooooo")
            .setTimestamp()
            .setColor(message.member.displayHexColor);
        const mooMessage = await this.send(embed, executionParameters);
        if (mooMessage === undefined) return;
        await mooMessage.react("🇲");
        await mooMessage.react("🅾️");
        await mooMessage.react("🇴");

        await StaffLog.FromCommand(this, message, executionParameters)?.send();
    }
}

export default MooCommand;