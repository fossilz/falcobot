import { Guild, Message, MessageEmbed } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import ReactionRoleModel from "../../dataModels/ReactionRoleModel";
import { ReactionRoleHandler } from '../../behaviors/ReactionRoleHandler';

class ReactionRoleCommand extends Command {
    constructor(){
        super({
            name: 'reactionrole',
            category: 'admin',
            usage: 'reactionRole add|list|pending|delete',
            description: 'Sets up role assignment on reactions to a specific message',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['reactionRole add #signup 8675309 :telephone: @Jenny'],
            logByDefault: false
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;

        const staffLog = StaffLog.FromCommandContext(this, message.guild, message.author, message.channel, message.content, executionParameters);

        const initialParam = args.shift();
        switch (initialParam) {
            case 'add':
                await ReactionRoleCommand.add(message.guild, args, staffLog, executionParameters);
                return;
            case 'list':
                await ReactionRoleCommand.list(message.guild, args, staffLog, executionParameters);
                return;
            case 'pending':
                await ReactionRoleCommand.pending(message.guild, args, staffLog, executionParameters);
                return;
            case 'delete':
                await ReactionRoleCommand.delete(message.guild, args, staffLog, executionParameters);
                return;
        }
        Command.send('This should have a syntax helper, but it doesn\'t yet', executionParameters);
    }

    private static add = async (guild: Guild, args: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 4) {
            Command.error('Invalid add syntax.  Proper syntax is !reactionRole add <channel ID/mention> <message ID> <emoji> <role ID/mention>', executionParameters);
            return;
        }

        const channel = Command.extractChannelMention(guild, args[0]);
        if (channel === undefined) {
            Command.error('Invalid channel.', executionParameters);
            return;
        }
        const messageID = args[1];
        const emoji = Command.extractEmoji(guild, args[2]);
        if (emoji === undefined) {
            Command.error('Invalid emoji.', executionParameters);
            return;
        }
        const role = Command.extractRoleMention(guild, args[3]);
        if (role === undefined) {
            Command.error('Invalid role.', executionParameters);
            return;
        }

        var rrModel = new ReactionRoleModel();
        rrModel.guild_id = guild.id;
        rrModel.channel_id = channel.id;
        rrModel.message_id = messageID;
        rrModel.emoji = emoji;
        rrModel.role_id = role.id;

        const repo = await RepositoryFactory.getInstanceAsync();
        const reactionrole_id = await repo.ReactionRoles.insert(rrModel);
        if (reactionrole_id !== undefined) {
            rrModel.reactionrole_id = reactionrole_id;

            // Wire up the listener
            await ReactionRoleHandler.SetupReactionRoleListenerAsync(guild, rrModel, repo);
            Command.send(`Reaction role ${reactionrole_id} created.`, executionParameters);
        } else {
            Command.error('Could not create reaction role.', executionParameters);
        }

        if (staffLog === null) return;
        staffLog.addField('Operation', 'add', true);
        staffLog.addField('Reaction Role ID', reactionrole_id, true);
        staffLog.addField('Channel', channel, true);
        staffLog.addField('Message', messageID, true);
        staffLog.addField('Emoji', emoji, true);
        staffLog.addField('Role', role, true);
        await staffLog.send();
    }

    private static list = async (guild: Guild, _: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const rrList = await repo.ReactionRoles.selectAll(guild.id);
        const listEmbed = new MessageEmbed()
            .setTitle('Reaction Roles')
            .setTimestamp();
        if (rrList.length === 0){
            listEmbed.setDescription('There are no reaction roles setup.');
            Command.send(listEmbed, executionParameters);
            return;
        }
        let channelId: string|null = null;
        let fieldString: string|null = null;
        for(let i = 0; i < rrList.length; i++) {
            const rr = rrList[i];
            const cid = rr.channel_id;
            if (cid !== channelId) {
                // Changed channels (potentially fields)
                ReactionRoleCommand.addChannelField(guild, channelId, listEmbed, fieldString);
                fieldString = null;
                channelId = cid;
            }
            if (fieldString !== null) { 
                fieldString = fieldString + '\n';
            } else fieldString = '';
            fieldString = fieldString + `${rr.reactionrole_id}: [${rr.message_id}] ${rr.emoji} <@&${rr.role_id}>`;
        }
        ReactionRoleCommand.addChannelField(guild, channelId, listEmbed, fieldString);
        Command.send(listEmbed, executionParameters);

        await staffLog?.send();
    }

    private static addChannelField = (guild: Guild, channelId: string|null, embed: MessageEmbed, fieldString: string|null) => {
        if (fieldString === null || channelId === null) return;
        const channel = guild.channels.cache.get(channelId);
        const channelName = channel === undefined ? "Unknown Channel" : `#${channel.name}`;
        embed.addField(channelName + " (" + channelId + ")", fieldString);
    }

    private static pending = async (guild: Guild, args: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const rr_id = args.shift();
        if (rr_id === undefined){
            Command.error('Proper syntax is !reactionRole pending <reaction role id>', executionParameters);
            return;
        }
        let reactionrole_id: number;
        try {
            reactionrole_id = parseInt(rr_id);
        } catch (err) {
            Command.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole pending <reaction role id>', executionParameters);
            return;
        }
        if (isNaN(reactionrole_id)) {
            Command.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole pending <reaction role id>', executionParameters);
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const count = await repo.MemberReactionRoles.getUnworkedCount(guild.id, reactionrole_id);
        Command.send(`There are ${count} roles pending assignment for reaction role ${reactionrole_id}.`, executionParameters);

        await staffLog?.send();
    }

    private static delete = async (guild: Guild, args: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const guild_id = guild.id;

        const rr_id = args.shift();
        if (rr_id === undefined){
            Command.error('Proper syntax is !reactionRole delete <reaction role id>', executionParameters);
            return;
        }
        let reactionrole_id: number;
        try {
            reactionrole_id = parseInt(rr_id);
        } catch (err) {
            Command.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>', executionParameters);
            return;
        }
        if (isNaN(reactionrole_id)) {
            Command.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>', executionParameters);
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const rr = await repo.ReactionRoles.select(guild_id, reactionrole_id);
        if (rr === undefined){
            Command.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>', executionParameters);
            return;
        }

        ReactionRoleHandler.StopListening(guild_id, reactionrole_id);
        await repo.MemberReactionRoles.deleteReactionRole(guild_id, reactionrole_id);
        await repo.ReactionRoles.delete(guild_id, reactionrole_id);
        Command.send(`Reaction role ${reactionrole_id} deleted.`, executionParameters);

        if (staffLog === null) return;
        staffLog.addField('Operation', 'delete', true);
        staffLog.addField('Reaction Role ID', reactionrole_id, true);
        staffLog.addField('Channel', guild.channels.cache.get(rr.channel_id), true);
        staffLog.addField('Message', rr.message_id, true);
        staffLog.addField('Emoji', rr.emoji, true);
        staffLog.addField('Role', guild.roles.cache.get(rr.role_id), true);
        await staffLog.send();
    }
}

export default ReactionRoleCommand;