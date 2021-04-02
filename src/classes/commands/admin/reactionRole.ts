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

        const initialParam = args.shift();
        switch (initialParam) {
            case 'add':
                await this.add(message, args, executionParameters);
                return;
            case 'list':
                await this.list(message, args, executionParameters);
                return;
            case 'pending':
                await this.pending(message, args, executionParameters);
                return;
            case 'delete':
                await this.delete(message, args, executionParameters);
                return;
        }
        message.channel.send('This should have a syntax helper, but it doesn\'t yet');
    }

    add = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;

        if (args.length !== 4) {
            this.error('Invalid add syntax.  Proper syntax is !reactionRole add <channel ID/mention> <message ID> <emoji> <role ID/mention>', executionParameters);
            return;
        }

        const channel = this.extractChannelMention(message, args[0]);
        if (channel === undefined) {
            this.error('Invalid channel.', executionParameters);
            return;
        }
        const messageID = args[1];
        const emoji = this.extractEmoji(message.guild, args[2]);
        if (emoji === undefined) {
            this.error('Invalid emoji.', executionParameters);
            return;
        }
        const role = this.extractRoleMention(message, args[3]);
        if (role === undefined) {
            this.error('Invalid role.', executionParameters);
            return;
        }

        var rrModel = new ReactionRoleModel();
        rrModel.guild_id = message.guild.id;
        rrModel.channel_id = channel.id;
        rrModel.message_id = messageID;
        rrModel.emoji = emoji;
        rrModel.role_id = role.id;

        const repo = await RepositoryFactory.getInstanceAsync();
        const reactionrole_id = await repo.ReactionRoles.insert(rrModel);
        if (reactionrole_id !== undefined) {
            rrModel.reactionrole_id = reactionrole_id;

            // Wire up the listener
            await ReactionRoleHandler.SetupReactionRoleListenerAsync(message.guild, rrModel, repo);
            this.send(`Reaction role ${reactionrole_id} created.`, executionParameters);
        } else {
            this.error('Could not create reaction role.', executionParameters);
        }

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        staffLog.addField('Operation', 'add', true);
        staffLog.addField('Reaction Role ID', reactionrole_id, true);
        staffLog.addField('Channel', channel, true);
        staffLog.addField('Message', messageID, true);
        staffLog.addField('Emoji', emoji, true);
        staffLog.addField('Role', role, true);
        await staffLog.send();
    }

    list = async (message: Message, _: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;

        const repo = await RepositoryFactory.getInstanceAsync();
        const rrList = await repo.ReactionRoles.selectAll(message.guild.id);
        const listEmbed = new MessageEmbed()
            .setTitle('Reaction Roles')
            .setTimestamp();
        if (rrList.length === 0){
            listEmbed.setDescription('There are no reaction roles setup.');
            this.send(listEmbed, executionParameters);
            return;
        }
        let channelId: string|null = null;
        let fieldString: string|null = null;
        for(let i = 0; i < rrList.length; i++) {
            const rr = rrList[i];
            const cid = rr.channel_id;
            if (cid !== channelId) {
                // Changed channels (potentially fields)
                this.addChannelField(message.guild, channelId, listEmbed, fieldString);
                fieldString = null;
                channelId = cid;
            }
            if (fieldString !== null) { 
                fieldString = fieldString + '\n';
            } else fieldString = '';
            fieldString = fieldString + `${rr.reactionrole_id}: [${rr.message_id}] ${rr.emoji} <@&${rr.role_id}>`;
        }
        this.addChannelField(message.guild, channelId, listEmbed, fieldString);
        this.send(listEmbed, executionParameters);

        await StaffLog.FromCommand(this, message, executionParameters)?.send();
    }

    addChannelField = (guild: Guild, channelId: string|null, embed: MessageEmbed, fieldString: string|null) => {
        if (fieldString === null || channelId === null) return;
        const channel = guild.channels.cache.get(channelId);
        const channelName = channel === undefined ? "Unknown Channel" : `#${channel.name}`;
        embed.addField(channelName + " (" + channelId + ")", fieldString);
    }

    pending = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;

        const rr_id = args.shift();
        if (rr_id === undefined){
            this.error('Proper syntax is !reactionRole pending <reaction role id>', executionParameters);
            return;
        }
        let reactionrole_id: number;
        try {
            reactionrole_id = parseInt(rr_id);
        } catch (err) {
            this.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole pending <reaction role id>', executionParameters);
            return;
        }
        if (isNaN(reactionrole_id)) {
            this.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole pending <reaction role id>', executionParameters);
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const count = await repo.MemberReactionRoles.getUnworkedCount(message.guild.id, reactionrole_id);
        this.send(`There are ${count} roles pending assignment for reaction role ${reactionrole_id}.`, executionParameters);

        await StaffLog.FromCommand(this, message, executionParameters)?.send();
    }

    delete = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        const guild_id = guild.id;

        const rr_id = args.shift();
        if (rr_id === undefined){
            this.error('Proper syntax is !reactionRole delete <reaction role id>', executionParameters);
            return;
        }
        let reactionrole_id: number;
        try {
            reactionrole_id = parseInt(rr_id);
        } catch (err) {
            this.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>', executionParameters);
            return;
        }
        if (isNaN(reactionrole_id)) {
            this.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>', executionParameters);
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const rr = await repo.ReactionRoles.select(guild_id, reactionrole_id);
        if (rr === undefined){
            this.error('Invalid Reaction Role ID.  Proper syntax is !reactionRole delete <reaction role id>', executionParameters);
            return;
        }

        ReactionRoleHandler.StopListening(guild_id, reactionrole_id);
        await repo.MemberReactionRoles.deleteReactionRole(guild_id, reactionrole_id);
        await repo.ReactionRoles.delete(guild_id, reactionrole_id);
        this.send(`Reaction role ${reactionrole_id} deleted.`, executionParameters);

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
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