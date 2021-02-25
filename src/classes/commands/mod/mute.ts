import { Message } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";

class MuteCommand extends Command {
    constructor(){
        super({
            name: 'mute',
            category: 'mod',
            usage: 'mute <user mention/ID> <time(#s|m|h|d)> [reason]',
            description: 'Mutes a user for specified amount of time (max 14 day)',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_MESSAGES'],
            defaultUserPermissions: ['MANAGE_ROLES'],
            examples: ['mute @fossilz 30s', 'mute @flamgo 30m Oh the sweet sound of silence']
        });
    }

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null) return;

        console.log('Called mute with args: ', args);
        // TODO : IMPLEMENT THE THING

        await StaffLog.FromCommand(this, message)?.send();
    }
}

export default MuteCommand;