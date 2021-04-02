import { Message } from "discord.js";
import { Command } from "../Command";
import RepositoryFactory from "../../RepositoryFactory";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { StaffLog } from "../../behaviors/StaffLog";

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

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const repo = await RepositoryFactory.getInstanceAsync();

        const channel = this.extractChannelMention(message, args[0]) || message.guild.channels.cache.get(args[0]);
        if (channel === undefined) {
            this.error('Cannot find channel', executionParameters);
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
            this.send(`Joining <#${channel.id}> will automatically assign <@&${roleId}>`, executionParameters);
        } else {
            this.send(`Joining <#${channel.id}> will not automatically assign a role.`, executionParameters);
        }
        
        await StaffLog.FromCommand(this, message, executionParameters)?.send();
    }
}

export default SetChannelAutoRoleCommand;