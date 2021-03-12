import { Guild, Message, MessageEmbed } from "discord.js";
import { Command } from "../Command";
import RepositoryFactory from "../../RepositoryFactory";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { StaffLog } from "../../behaviors/StaffLog";
import PermissionSetModel from "../../dataModels/PermissionSetModel";
import { PermissionSetItemModel } from "../../dataModels/PermissionSetItemModel";

class PermissionSetCommand extends Command {
    constructor(){
        super({
            name: 'permissionset',
            category: 'admin',
            usage: 'permissionset <create|list|delete ID> OR permissionset <ID> [allow|deny] <role|channel ID/mention>',
            description: 'Administer permission sets',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['permissionset create Mods Only','pset list'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            aliases: ['pset']
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;

        const initialArg = args.shift() || "list";

        switch(initialArg) {
            case "create":
                await this.create(guild, message, args, executionParameters);
                break;
            case "delete":
                await this.delete(guild, message, args, executionParameters);
                break;
            case "list":
                await this.list(guild, message, executionParameters);
                break;
            default:
                await this.pset(guild, message, initialArg, args, executionParameters);
                break;
        }
    }

    list = async (guild: Guild, message: Message, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (guild.me === null) return;
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSets = await repo.PermissionSets.selectAll(guild.id);

        let description = 'No permission sets have been created';
        if (permissionSets.length > 0) {
            description = permissionSets.map(x => `${x.set_id}: ${x.name}`).join('\n');
        }
        
        const embed = new MessageEmbed()
            .setTimestamp()
            .setTitle('Permission Sets')
            .setColor(guild.me.displayHexColor)
            .setFooter('permissionset <id> for more information.')
            .setDescription(description);
        
        this.send(embed, executionParameters);
        
        await StaffLog.FromCommand(this, message, executionParameters)?.send();
    }

    create = async (guild: Guild, message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (args.length === 0) {
            this.error('Invalid create syntax.  Please use: permissionset create <name>', executionParameters);
            return;
        }
        const name = args.join(' ').trim();
        if (name === ''){
            this.error('Invalid create syntax.  Please use: permissionset create <name>', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSetId = await repo.PermissionSets.insert(guild.id, name);
        if (permissionSetId === undefined) {
            this.error('Unable to create permission set.', executionParameters);
            return;
        }
        this.send(`Permission set ${permissionSetId} created.`, executionParameters);

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        staffLog.addField('Action', 'Created', true);
        staffLog.addField('Set ID', permissionSetId, true);
        staffLog.addField('Name', name, true);
        await staffLog.send();
    }

    delete = async (guild: Guild, message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (guild.me === null) return;
        const initialArg = args.shift();
        if (initialArg === undefined){
            this.error('Invalid syntax.  Please use: permissionset delete <id>', executionParameters);
            return;
        }
        const psetId = parseInt(initialArg);
        if (isNaN(psetId)){
            this.error('Invalid syntax.  Please use: permissionset delete <id>', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSet = await repo.PermissionSets.select(guild.id, psetId);
        if (permissionSet === undefined){
            this.error('Invalid Permission Set.  Please supply a valid ID.  See permissionset list for all valid sets.', executionParameters);
            return;
        }
        await repo.PermissionSets.delete(guild.id, psetId);

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        staffLog.addField('Action', 'Deleted', true);
        staffLog.addField('Set ID', psetId, true);
        staffLog.addField('Name', permissionSet.name, true);
        await staffLog.send();
    }

    pset = async (guild: Guild, message: Message, initialArg: string, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (guild.me === null) return;
        const psetId = parseInt(initialArg);
        if (isNaN(psetId)){
            this.error('Invalid syntax.  Please use: permissionset <id>', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSet = await repo.PermissionSets.select(guild.id, psetId);
        if (permissionSet === undefined){
            this.error('Invalid Permission Set.  Please supply a valid ID.  See permissionset list for all valid sets.', executionParameters);
            return;
        }

        const psetArg = args.shift();
        if (psetArg === 'deny'){
            await this.deny(guild, message, args, permissionSet, executionParameters);
            return;
        }
        if (psetArg === 'allow'){
            await this.allow(guild, message, args, permissionSet, executionParameters);
            return;
        }
        if (psetArg !== undefined) {
            this.error('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>', executionParameters);
            return;
        }

        const setItems = await repo.PermissionSets.selectItems(guild.id, psetId);
        const roleWhitelist = setItems.filter(x=> x.object_type == "Role" && x.allow).map(this.getMention);
        const roleBlacklist = setItems.filter(x=> x.object_type == "Role" && !x.allow).map(this.getMention);
        const channelWhitelist = setItems.filter(x=> x.object_type == "Channel" && x.allow).map(this.getMention);
        const channelBlacklist = setItems.filter(x=> x.object_type == "Channel" && !x.allow).map(this.getMention);
        
        const embed = new MessageEmbed()
            .setTitle(`Permission Set ${psetId}`)
            .setTimestamp()
            .setColor(guild.me.displayHexColor)
            .setFooter('permissionset <ID> [allow|deny] <role|channel ID/mention>')
            .setDescription(permissionSet.name);
        if (permissionSet.useRoleWhitelist){
            embed.addField('Allowed Roles', roleWhitelist.length > 0 ? roleWhitelist.join(' ') : 'None');
        }
        if (roleBlacklist.length > 0){
            embed.addField('Denied Roles', roleBlacklist.join(' '));
        }
        if (permissionSet.useChannelWhitelist){
            embed.addField('Allowed Channels', channelWhitelist.length > 0 ? channelWhitelist.join(' ') : 'None');
        }
        if (channelBlacklist.length > 0){
            embed.addField('Denied Channels', channelBlacklist.join(' '));
        }
        
        // TODO : count of commands/autoresponders in this permission set?
        
        this.send(embed, executionParameters);
        
        await StaffLog.FromCommand(this, message, executionParameters)?.send();
    }

    deny = async (guild: Guild, message: Message, args: string[], permissionSet: PermissionSetModel, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const id = args.shift();
        if (id === undefined) {
            this.error('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>', executionParameters);
            return;
        }
        const setItem = this.extractPermissionSetItem(guild, id);
        if (setItem === undefined){
            this.error('Invalid role or channel ID/mention.', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.PermissionSets.blacklist(guild.id, permissionSet.set_id, setItem.object_type, setItem.object_id);

        const mention = this.getMention(setItem);
        this.send(`${setItem.object_type} ${mention} added to blacklist for permission set ${permissionSet.set_id} (${permissionSet.name})`, executionParameters);
        
        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        staffLog.addField('Set ID', permissionSet.set_id, true);
        staffLog.addField('Set Name', permissionSet.name, true);
        staffLog.addField('Blacklisted', mention, true);
        await staffLog.send();
    }

    allow = async (guild: Guild, message: Message, args: string[], permissionSet: PermissionSetModel, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const id = args.shift();
        if (id === undefined) {
            this.error('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>', executionParameters);
            return;
        }
        const setItem = this.extractPermissionSetItem(guild, id);
        if (setItem === undefined){
            this.error('Invalid role or channel ID/mention.', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.PermissionSets.whitelist(guild.id, permissionSet.set_id, setItem.object_type, setItem.object_id);

        const mention = this.getMention(setItem);
        this.send(`${setItem.object_type} ${mention} added to whitelist for permission set ${permissionSet.set_id} (${permissionSet.name})`, executionParameters);

        const staffLog = StaffLog.FromCommand(this, message, executionParameters);
        if (staffLog === null) return;
        staffLog.addField('Set ID', permissionSet.set_id, true);
        staffLog.addField('Set Name', permissionSet.name, true);
        staffLog.addField('Whitelisted', mention, true);
        await staffLog.send();
    }

    extractPermissionSetItem = (guild: Guild, mention: string) : PermissionSetItemModel|undefined => {
        const mentionedRoleId = this.extractRoleIDFromMention(mention);
        const role = guild.roles.cache.get(mentionedRoleId || mention);
        if (role !== undefined) {
            return new PermissionSetItemModel(guild.id, role.id, "Role");
        }
        const mentionedChannelId = this.extractChannelIDFromMention(mention);
        const channel = guild.channels.cache.get(mentionedChannelId || mention);
        if (channel != undefined) {
            return new PermissionSetItemModel(guild.id, channel.id, "Channel");
        }
        return undefined;
    }

    getMention = (setItem: PermissionSetItemModel) : string => {
        if (setItem.object_type === "Role") {
            return `<@&${setItem.object_id}>`;
        }
        if (setItem.object_type === "Channel") {
            return `<#${setItem.object_id}>`;
        }
        if (setItem.object_type === "User") {
            return `<@${setItem.object_id}>`;
        }
        return setItem.object_id;
    }
}

export default PermissionSetCommand;