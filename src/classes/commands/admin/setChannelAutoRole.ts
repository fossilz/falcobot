import { Message } from "discord.js";
import { Command } from "../Command";
import RepositoryFactory from "../../RepositoryFactory";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class SetChannelAutoRoleCommand extends Command {
    constructor(){
        super({
            name: 'setchannelautorole',
            category: 'admin',
            usage: 'setchannelautorole [channel mention/ID] [role mention/ID]',
            description: 'Sets a role to automatically assign when joining a voice channel (null to remove)',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['setchannelautorole #voice-channel @VCRole'],
            defaultUserPermissions: ['MANAGE_GUILD']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();

        const channel = Command.extractChannelMention(commandExec.guild, args[0]) || commandExec.guild.channels.cache.get(args[0]);
        if (channel === undefined) {
            await commandExec.errorAsync('Cannot find channel');
            return;
        }

        let roleId: string|null = null;
        if (args.length == 2) {
            const role = Command.extractRoleMention(commandExec.guild, args[1]) || commandExec.guild.roles.cache.get(args[1]);
            if (role !== undefined) {
                roleId = role.id;
            }
        }

        await repo.Channels.updateAutoRole(commandExec.guild.id, channel.id, roleId);

        if (roleId !== null) {
            await commandExec.sendAsync(`Joining <#${channel.id}> will automatically assign <@&${roleId}>`);
        } else {
            await commandExec.sendAsync(`Joining <#${channel.id}> will not automatically assign a role.`);
        }
        
        await commandExec.logDefaultAsync();
    }
}

export default SetChannelAutoRoleCommand;