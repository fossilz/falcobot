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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild_id = commandExec.guild.id;

        const prefix = args[0];
        if (prefix === undefined || prefix === ''){
            await commandExec.errorAsync('Please specify a prefix character.');
            return;
        }

        if (prefix.length > 1){
            await commandExec.errorAsync('Please use only a single character for command prefix.');
            return;
        }

        if (/^[a-zA-Z0-9\\\s]$/g.test(prefix)){
            await commandExec.errorAsync('Please do not use letters, numbers, a slash, or space as the command prefix.');
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.Guilds.updatePrefix(guild_id, prefix);

        GuildCache.ClearCache(guild_id);

        await commandExec.sendAsync(`Command prefix set to ${prefix}`);
    }
}

export default SetPrefixCommand;