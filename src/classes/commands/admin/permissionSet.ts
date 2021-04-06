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
            aliases: ['pset'],
            adminOnly: true
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        
        const staffLog = StaffLog.FromCommandContext(this, message.guild, message.author, message.channel, message.content, executionParameters);

        const initialArg = args.shift() || "list";

        switch(initialArg) {
            case "create":
                await PermissionSetCommand.create(guild, args, staffLog, executionParameters);
                break;
            case "delete":
                await PermissionSetCommand.delete(guild, args, staffLog, executionParameters);
                break;
            case "list":
                await PermissionSetCommand.list(guild, staffLog, executionParameters);
                break;
            default:
                await PermissionSetCommand.pset(guild, initialArg, args, staffLog, executionParameters);
                break;
        }
    }

    private static list = async (guild: Guild, staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
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
        
        Command.send(embed, executionParameters);
        
        await staffLog?.send();
    }

    private static create = async (guild: Guild, args: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (args.length === 0) {
            Command.error('Invalid create syntax.  Please use: permissionset create <name>', executionParameters);
            return;
        }
        const name = args.join(' ').trim();
        if (name === ''){
            Command.error('Invalid create syntax.  Please use: permissionset create <name>', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSetId = await repo.PermissionSets.insert(guild.id, name);
        if (permissionSetId === undefined) {
            Command.error('Unable to create permission set.', executionParameters);
            return;
        }
        Command.send(`Permission set ${permissionSetId} created.`, executionParameters);

        if (staffLog === null) return;
        staffLog.addField('Action', 'Created', true);
        staffLog.addField('Set ID', permissionSetId, true);
        staffLog.addField('Name', name, true);
        await staffLog.send();
    }

    private static delete = async (guild: Guild, args: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (guild.me === null) return;
        const initialArg = args.shift();
        if (initialArg === undefined){
            Command.error('Invalid syntax.  Please use: permissionset delete <id>', executionParameters);
            return;
        }
        const psetId = parseInt(initialArg);
        if (isNaN(psetId)){
            Command.error('Invalid syntax.  Please use: permissionset delete <id>', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSet = await repo.PermissionSets.select(guild.id, psetId);
        if (permissionSet === undefined){
            Command.error('Invalid Permission Set.  Please supply a valid ID.  See permissionset list for all valid sets.', executionParameters);
            return;
        }
        await repo.PermissionSets.delete(guild.id, psetId);

        if (staffLog === null) return;
        staffLog.addField('Action', 'Deleted', true);
        staffLog.addField('Set ID', psetId, true);
        staffLog.addField('Name', permissionSet.name, true);
        await staffLog.send();
    }

    private static pset = async (guild: Guild, initialArg: string, args: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (guild.me === null) return;
        const psetId = parseInt(initialArg);
        if (isNaN(psetId)){
            Command.error('Invalid syntax.  Please use: permissionset <id>', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSet = await repo.PermissionSets.select(guild.id, psetId);
        if (permissionSet === undefined){
            Command.error('Invalid Permission Set.  Please supply a valid ID.  See permissionset list for all valid sets.', executionParameters);
            return;
        }

        const psetArg = args.shift();
        if (psetArg === 'deny'){
            await PermissionSetCommand.deny(guild, args, permissionSet, staffLog, executionParameters);
            return;
        }
        if (psetArg === 'allow'){
            await PermissionSetCommand.allow(guild, args, permissionSet, staffLog, executionParameters);
            return;
        }
        if (psetArg !== undefined) {
            Command.error('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>', executionParameters);
            return;
        }

        const setItems = await repo.PermissionSets.selectItems(guild.id, psetId);
        const roleWhitelist = setItems.filter(x=> x.object_type == "Role" && x.allow).map(PermissionSetCommand.getMention);
        const roleBlacklist = setItems.filter(x=> x.object_type == "Role" && !x.allow).map(PermissionSetCommand.getMention);
        const channelWhitelist = setItems.filter(x=> x.object_type == "Channel" && x.allow).map(PermissionSetCommand.getMention);
        const channelBlacklist = setItems.filter(x=> x.object_type == "Channel" && !x.allow).map(PermissionSetCommand.getMention);
        
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
        
        Command.send(embed, executionParameters);
        
        await staffLog?.send();
    }

    private static deny = async (guild: Guild, args: string[], permissionSet: PermissionSetModel, staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const id = args.shift();
        if (id === undefined) {
            Command.error('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>', executionParameters);
            return;
        }
        const setItem = PermissionSetCommand.extractPermissionSetItem(guild, id);
        if (setItem === undefined){
            Command.error('Invalid role or channel ID/mention.', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.PermissionSets.blacklist(guild.id, permissionSet.set_id, setItem.object_type, setItem.object_id);

        const mention = PermissionSetCommand.getMention(setItem);
        Command.send(`${setItem.object_type} ${mention} added to blacklist for permission set ${permissionSet.set_id} (${permissionSet.name})`, executionParameters);
        
        if (staffLog === null) return;
        staffLog.addField('Set ID', permissionSet.set_id, true);
        staffLog.addField('Set Name', permissionSet.name, true);
        staffLog.addField('Blacklisted', mention, true);
        await staffLog.send();
    }

    private static allow = async (guild: Guild, args: string[], permissionSet: PermissionSetModel, staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const id = args.shift();
        if (id === undefined) {
            Command.error('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>', executionParameters);
            return;
        }
        const setItem = PermissionSetCommand.extractPermissionSetItem(guild, id);
        if (setItem === undefined){
            Command.error('Invalid role or channel ID/mention.', executionParameters);
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.PermissionSets.whitelist(guild.id, permissionSet.set_id, setItem.object_type, setItem.object_id);

        const mention = PermissionSetCommand.getMention(setItem);
        Command.send(`${setItem.object_type} ${mention} added to whitelist for permission set ${permissionSet.set_id} (${permissionSet.name})`, executionParameters);

        if (staffLog === null) return;
        staffLog.addField('Set ID', permissionSet.set_id, true);
        staffLog.addField('Set Name', permissionSet.name, true);
        staffLog.addField('Whitelisted', mention, true);
        await staffLog.send();
    }

    private static extractPermissionSetItem = (guild: Guild, mention: string) : PermissionSetItemModel|undefined => {
        const mentionedRoleId = Command.extractRoleIDFromMention(mention);
        const role = guild.roles.cache.get(mentionedRoleId || mention);
        if (role !== undefined) {
            return new PermissionSetItemModel(guild.id, role.id, "Role");
        }
        const mentionedChannelId = Command.extractChannelIDFromMention(mention);
        const channel = guild.channels.cache.get(mentionedChannelId || mention);
        if (channel != undefined) {
            return new PermissionSetItemModel(guild.id, channel.id, "Channel");
        }
        return undefined;
    }

    private static getMention = (setItem: PermissionSetItemModel) : string => {
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