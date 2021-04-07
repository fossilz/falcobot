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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();

        let channel = Command.extractChannelMention(commandExec.guild, args[0]) || commandExec.guild.channels.cache.get(args[0]);

        await repo.Guilds.updateStaffLogChannel(commandExec.guild.id, channel?.id || null);

        GuildCache.ClearCache(commandExec.guild.id);

        if (channel) {
            await commandExec.sendAsync(`Staff Log channel set to <#${channel.id}>`);
        } else {
            await commandExec.sendAsync(`Staff Log channel cleared (logging disabled)`);
        }
    }
}

export default SetLogChannelCommand;