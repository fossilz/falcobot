import { Message } from "discord.js";
import { Command } from "../Command";
import RepositoryFactory from "../../RepositoryFactory";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import GuildCache from "../../cache/GuildCache";

class SetPrefixCommand extends Command {
    constructor(){
        super({
            name: 'setprefix',
            category: 'admin',
            usage: 'setprefix [prefix char]',
            description: 'Set\'s the bot command prefix',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['setprefix !'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            logByDefault: false,
            adminOnly: true
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild_id = message.guild.id;

        const prefix = args[0];
        if (prefix === undefined || prefix === ''){
            Command.error('Please specify a prefix character.', executionParameters);
            return;
        }

        if (prefix.length > 1){
            Command.error('Please use only a single character for command prefix.', executionParameters);
            return;
        }

        if (/^[a-zA-Z0-9\\\s]$/g.test(prefix)){
            Command.error('Please do not use letters, numbers, a slash, or space as the command prefix.', executionParameters);
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.Guilds.updatePrefix(guild_id, prefix);

        GuildCache.ClearCache(guild_id);

        Command.send(`Command prefix set to ${prefix}`, executionParameters);
    }
}

export default SetPrefixCommand;