import { Message } from "discord.js";
import { Command } from "../Command";
import RepositoryFactory from "../../RepositoryFactory";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import GuildCache from "../../cache/GuildCache";

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
        const guild = message.guild;
        const repo = await RepositoryFactory.getInstanceAsync();

        let channel = Command.extractChannelMention(guild, args[0]) || guild.channels.cache.get(args[0]);

        await repo.Guilds.updateStaffLogChannel(guild.id, channel?.id || null);

        GuildCache.ClearCache(guild.id);

        if (channel) {
            Command.send(`Staff Log channel set to <#${channel.id}>`, executionParameters);
        } else {
            Command.send(`Staff Log channel cleared (logging disabled)`, executionParameters);
        }
    }
}

export default SetLogChannelCommand;