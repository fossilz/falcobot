import { Guild, Message, MessageEmbed } from "discord.js";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import ReactionRoleModel from "../../dataModels/ReactionRoleModel";
import { ReactionRoleHandler } from '../../behaviors/ReactionRoleHandler';

export class ReactionRoleCommand extends Command {
    public static readonly CommandName: string = 'reactionrole';

    constructor(){
        super({
            name: ReactionRoleCommand.CommandName,
            childCommands: [ReactionRoleAddCommand.CommandName, ReactionRoleListCommand.CommandName, ReactionRolePendingCommand.CommandName, ReactionRoleDeleteCommand.CommandName],
            category: 'admin',
            usage: 'reactionRole add|list|pending|delete',
            description: 'Sets up role assignment on reactions to a specific message',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['reactionRole add #signup 8675309 :telephone: @Jenny'],
            logByDefault: true
        });
    }

    run = async (message: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {

        const initialParam = args.shift();
        switch (initialParam) {
            case 'add':
                await this.runChildCommandAsync(ReactionRoleAddCommand.CommandName, message, args, commandExec);
                return;
            case 'list':
                await this.runChildCommandAsync(ReactionRoleListCommand.CommandName, message, args, commandExec);
                return;
            case 'pending':
                await this.runChildCommandAsync(ReactionRolePendingCommand.CommandName, message, args, commandExec);
                return;
            case 'delete':
            await this.runChildCommandAsync(ReactionRoleDeleteCommand.CommandName, message, args, commandExec);
                return;
        }
        await commandExec.sendAsync('This should have a syntax helper, but it doesn\'t yet');
    }
}

export class ReactionRoleAddCommand extends Command {
    public static readonly CommandName: string = 'reactionrole.add';

    constructor(){
        super({
            name: ReactionRoleAddCommand.CommandName,
            parentCommand: ReactionRoleCommand.CommandName,
            category: 'admin',
            usage: 'reactionRole add <channel ID/mention> <messageID> <emoji> <role ID/mention>',
            description: 'Sets up role assignment on reactions to a specific message',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['reactionRole add #signup 8675309 :telephone: @Jenny'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 4) {
            await commandExec.errorAsync('Invalid add syntax.  Proper syntax is !reactionRole add <channel ID/mention> <message ID> <emoji> <role ID/mention>');
            return;
        }

        const channel = Command.extractChannelMention(commandExec.guild, args[0]);
        if (channel === undefined) {
            await commandExec.errorAsync('Invalid channel.');
            return;
        }
        const messageID = args[1];
        const emoji = Command.extractEmoji(commandExec.guild, args[2]);
        if (emoji === undefined) {
            await commandExec.errorAsync('Invalid emoji.');
            return;
        }
        const role = Command.extractRoleMention(commandExec.guild, args[3]);
        if (role === undefined) {
            await commandExec.errorAsync('Invalid role.');
            return;
        }

        var rrModel = new ReactionRoleModel();
        rrModel.guild_id = commandExec.guild.id;
        rrModel.channel_id = channel.id;
        rrModel.message_id = messageID;
        rrModel.emoji = emoji;
        rrModel.role_id = role.id;

        const repo = await RepositoryFactory.getInstanceAsync();
        const reactionrole_id = await repo.ReactionRoles.insert(rrModel);
        if (reactionrole_id !== undefined) {
            rrModel.reactionrole_id = reactionrole_id;

            // Wire up the listener
            await ReactionRoleHandler.SetupReactionRoleListenerAsync(commandExec.guild, rrModel, repo);
            await commandExec.sendAsync(`Reaction role ${reactionrole_id} created.`);
        } else {
            await commandExec.errorAsync('Could not create reaction role.');
        }

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('Operation', 'add', true);
        commandLog.addField('Reaction Role ID', reactionrole_id, true);
        commandLog.addField('Channel', channel, true);
        commandLog.addField('Message', messageID, true);
        commandLog.addField('Emoji', emoji, true);
        commandLog.addField('Role', role, true);
        await commandExec.logAsync(commandLog);
    }
}

export class ReactionRoleListCommand extends Command {
    public static readonly CommandName: string = 'reactionrole.list';

    constructor(){
        super({
            name: ReactionRoleListCommand.CommandName,
            parentCommand: ReactionRoleCommand.CommandName,
            category: 'admin',
            usage: 'reactionRole list',
            description: 'Lists automatic role assignments',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['reactionRole list'],
            logByDefault: false
        });
    }

    run = async (_: Message, __: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const rrList = await repo.ReactionRoles.selectAll(commandExec.guild.id);
        const listEmbed = new MessageEmbed()
            .setTitle('Reaction Roles')
            .setTimestamp();
        if (rrList.length === 0){
            listEmbed.setDescription('There are no reaction roles setup.');
            await commandExec.sendAsync(listEmbed);
            return;
        }
        let channelId: string|null = null;
        let fieldString: string|null = null;
        for(let i = 0; i < rrList.length; i++) {
            const rr = rrList[i];
            const cid = rr.channel_id;
            if (cid !== channelId) {
                // Changed channels (potentially fields)
                ReactionRoleListCommand.addChannelField(commandExec.guild, channelId, listEmbed, fieldString);
                fieldString = null;
                channelId = cid;
            }
            if (fieldString !== null) { 
                fieldString = fieldString + '\n';
            } else fieldString = '';
            fieldString = fieldString + `${rr.reactionrole_id}: [${rr.message_id}] ${rr.emoji} <@&${rr.role_id}>`;
        }
        ReactionRoleListCommand.addChannelField(commandExec.guild, channelId, listEmbed, fieldString);
        await commandExec.sendAsync(listEmbed);

        await commandExec.logDefaultAsync();
    }

    private static addChannelField = (guild: Guild, channelId: string|null, embed: MessageEmbed, fieldString: string|null) => {
        if (fieldString === null || channelId === null) return;
        const channel = guild.channels.cache.get(channelId);
        const channelName = channel === undefined ? "Unknown Channel" : `#${channel.name}`;
        embed.addField(channelName + " (" + channelId + ")", fieldString);
    }
}

export class ReactionRolePendingCommand extends Command {
    public static readonly CommandName: string = 'reactionrole.pending';

    constructor(){
        super({
            name: ReactionRolePendingCommand.CommandName,
            parentCommand: ReactionRoleCommand.CommandName,
            category: 'admin',
            usage: 'reactionRole pending <ID>',
            description: 'Lists pending role assignments for the specified reaction role',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['reactionRole pending 15'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const rr_id = args.shift();
        if (rr_id === undefined){
            await commandExec.errorAsync('Proper syntax is !reactionRole pending <reaction role id>');
            return;
        }
        let reactionrole_id: number;
        try {
            reactionrole_id = parseInt(rr_id);
        } catch (err) {
            await commandExec.errorAsync('Invalid Reaction Role ID.  Proper syntax is !reactionRole pending <reaction role id>');
            return;
        }
        if (isNaN(reactionrole_id)) {
            await commandExec.errorAsync('Invalid Reaction Role ID.  Proper syntax is !reactionRole pending <reaction role id>');
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const count = await repo.MemberReactionRoles.getUnworkedCount(commandExec.guild.id, reactionrole_id);
        await commandExec.sendAsync(`There are ${count} roles pending assignment for reaction role ${reactionrole_id}.`);

        await commandExec.logDefaultAsync();
    }
}

export class ReactionRoleDeleteCommand extends Command {
    public static readonly CommandName: string = 'reactionrole.delete';

    constructor(){
        super({
            name: ReactionRoleDeleteCommand.CommandName,
            parentCommand: ReactionRoleCommand.CommandName,
            category: 'admin',
            usage: 'reactionRole delete <ID>',
            description: 'Deletes the specified reaction role',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['reactionRole delete 15'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild_id = commandExec.guild.id;

        const rr_id = args.shift();
        if (rr_id === undefined){
            await commandExec.errorAsync('Proper syntax is !reactionRole delete <reaction role id>');
            return;
        }
        let reactionrole_id: number;
        try {
            reactionrole_id = parseInt(rr_id);
        } catch (err) {
            await commandExec.errorAsync('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>');
            return;
        }
        if (isNaN(reactionrole_id)) {
            await commandExec.errorAsync('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>');
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const rr = await repo.ReactionRoles.select(guild_id, reactionrole_id);
        if (rr === undefined){
            await commandExec.errorAsync('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>');
            return;
        }

        ReactionRoleHandler.StopListening(guild_id, reactionrole_id);
        await repo.MemberReactionRoles.deleteReactionRole(guild_id, reactionrole_id);
        await repo.ReactionRoles.delete(guild_id, reactionrole_id);
        await commandExec.sendAsync(`Reaction role ${reactionrole_id} deleted.`);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('Operation', 'delete', true);
        commandLog.addField('Reaction Role ID', reactionrole_id, true);
        commandLog.addField('Channel', commandExec.guild.channels.cache.get(rr.channel_id), true);
        commandLog.addField('Message', rr.message_id, true);
        commandLog.addField('Emoji', rr.emoji, true);
        commandLog.addField('Role', commandExec.guild.roles.cache.get(rr.role_id), true);
        await commandExec.logAsync(commandLog);
    }
}

export const ReactionRoleCommands: Command[] = [
    new ReactionRoleCommand(),
    new ReactionRoleAddCommand(),
    new ReactionRoleListCommand(),
    new ReactionRolePendingCommand(),
    new ReactionRoleDeleteCommand()
];