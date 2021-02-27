import { Message } from "discord.js";
import { Command } from "../Command";
import RepositoryFactory from "../../RepositoryFactory";

class SetChannelAutoRoleCommand extends Command {
    constructor(){
        super({
            name: 'setchannelautorole',
            category: 'admin',
            usage: 'setchannelautorole [channel mention/ID] [role mention/ID]',
            description: 'Set\'s a role to automatically assign when joining a voice channel (null to remove)',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['setchannelautorole #voice-channel @VCRole'],
            defaultUserPermissions: ['ADMINISTRATOR']
        });
    }

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const repo = await RepositoryFactory.getInstanceAsync();

        const channel = this.extractChannelMention(message, args[0]) || message.guild.channels.cache.get(args[0]);
        if (channel === undefined) {
            // Error
            return;
        }

        let roleId: string|null = null;
        if (args.length == 2) {
            const role = this.extractRoleMention(message, args[1]) || message.guild.roles.cache.get(args[1]);
            if (role !== undefined) {
                roleId = role.id;
            }
        }

        await repo.Channels.updateAutoRole(message.guild.id, channel.id, roleId);

        if (roleId !== null) {
            message.channel.send(`Joining <#${channel.id}> will automatically assign <@&${roleId}>`);
        } else {
            message.channel.send(`Joining <#${channel.id}> will not automatically assign a role.`);
        }
    }
}

export default SetChannelAutoRoleCommand;