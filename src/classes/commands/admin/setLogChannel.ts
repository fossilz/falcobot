import { Message } from "discord.js";
import { Command } from "../Command";
import RepositoryFactory from "../../RepositoryFactory";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class SetLogChannelCommand extends Command {
    constructor(){
        super({
            name: 'setlogchannel',
            category: 'admin',
            usage: 'setlogchannel [channel mention/ID]',
            description: 'Set\'s the staff log channel (no channel to clear)',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['setlogchannel #staff-logs'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            logByDefault: false,
            adminOnly: true
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const repo = await RepositoryFactory.getInstanceAsync();

        let channel = this.extractChannelMention(message, args[0]) || message.guild.channels.cache.get(args[0]);

        await repo.Guilds.updateStaffLogChannel(message.guild.id, channel?.id || null);

        if (channel) {
            this.send(`Staff Log channel set to <#${channel.id}>`, executionParameters);
        } else {
            this.send(`Staff Log channel cleared (logging disabled)`, executionParameters);
        }
    }
}

export default SetLogChannelCommand;