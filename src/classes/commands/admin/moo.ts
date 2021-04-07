import { Message, MessageEmbed } from "discord.js";
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

    run = async (_: Message, __: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;

        const embed = new MessageEmbed()
            .setTitle('Moo')
            .setImage("https://media.giphy.com/media/KSOb453X3WPRu/giphy.gif")
            .setFooter("Mooooo")
            .setTimestamp()
            .setColor(commandExec.messageMember.displayHexColor);
        const mooMessage = await commandExec.sendAsync(embed);
        if (mooMessage === undefined) return;
        await mooMessage.react("🇲");
        await mooMessage.react("🅾️");
        await mooMessage.react("🇴");

        await commandExec.logDefaultAsync();
    }
}

export default MooCommand;