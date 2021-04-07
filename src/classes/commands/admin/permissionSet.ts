import { Guild, Message, MessageEmbed } from "discord.js";
import { Command } from "../Command";
import RepositoryFactory from "../../RepositoryFactory";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const initialArg = args.shift() || "list";

        switch(initialArg) {
            case "create":
                await PermissionSetCommand.create(args, commandExec);
                break;
            case "delete":
                await PermissionSetCommand.delete(args, commandExec);
                break;
            case "list":
                await PermissionSetCommand.list(commandExec);
                break;
            default:
                await PermissionSetCommand.pset(initialArg, args, commandExec);
                break;
        }
    }

    private static list = async (commandExec: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSets = await repo.PermissionSets.selectAll(commandExec.guild.id);

        let description = 'No permission sets have been created';
        if (permissionSets.length > 0) {
            description = permissionSets.map(x => `${x.set_id}: ${x.name}`).join('\n');
        }
        
        const embed = new MessageEmbed()
            .setTimestamp()
            .setTitle('Permission Sets')
            .setColor(commandExec.me.displayHexColor)
            .setFooter('permissionset <id> for more information.')
            .setDescription(description);
        
        await commandExec.sendAsync(embed);
        
        await commandExec.logDefaultAsync();
    }

    private static create = async (args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length === 0) {
            await commandExec.errorAsync('Invalid create syntax.  Please use: permissionset create <name>');
            return;
        }
        const name = args.join(' ').trim();
        if (name === ''){
            await commandExec.errorAsync('Invalid create syntax.  Please use: permissionset create <name>');
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSetId = await repo.PermissionSets.insert(commandExec.guild.id, name);
        if (permissionSetId === undefined) {
            await commandExec.errorAsync('Unable to create permission set.');
            return;
        }
        await commandExec.sendAsync(`Permission set ${permissionSetId} created.`);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('Action', 'Created', true);
        commandLog.addField('Set ID', permissionSetId, true);
        commandLog.addField('Name', name, true);
        await commandExec.logAsync(commandLog);
    }

    private static delete = async (args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const initialArg = args.shift();
        if (initialArg === undefined){
            await commandExec.errorAsync('Invalid syntax.  Please use: permissionset delete <id>');
            return;
        }
        const psetId = parseInt(initialArg);
        if (isNaN(psetId)){
            await commandExec.errorAsync('Invalid syntax.  Please use: permissionset delete <id>');
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSet = await repo.PermissionSets.select(commandExec.guild.id, psetId);
        if (permissionSet === undefined){
            await commandExec.errorAsync('Invalid Permission Set.  Please supply a valid ID.  See permissionset list for all valid sets.');
            return;
        }
        await repo.PermissionSets.delete(commandExec.guild.id, psetId);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('Action', 'Deleted', true);
        commandLog.addField('Set ID', psetId, true);
        commandLog.addField('Name', permissionSet.name, true);
        await commandExec.logAsync(commandLog);
    }

    private static pset = async (initialArg: string, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const psetId = parseInt(initialArg);
        if (isNaN(psetId)){
            await commandExec.errorAsync('Invalid syntax.  Please use: permissionset <id>');
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const permissionSet = await repo.PermissionSets.select(commandExec.guild.id, psetId);
        if (permissionSet === undefined){
            await commandExec.errorAsync('Invalid Permission Set.  Please supply a valid ID.  See permissionset list for all valid sets.');
            return;
        }

        const psetArg = args.shift();
        if (psetArg === 'deny'){
            await PermissionSetCommand.deny(args, permissionSet, commandExec);
            return;
        }
        if (psetArg === 'allow'){
            await PermissionSetCommand.allow(args, permissionSet, commandExec);
            return;
        }
        if (psetArg !== undefined) {
            await commandExec.errorAsync('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>');
            return;
        }

        const setItems = await repo.PermissionSets.selectItems(commandExec.guild.id, psetId);
        const roleWhitelist = setItems.filter(x=> x.object_type == "Role" && x.allow).map(PermissionSetCommand.getMention);
        const roleBlacklist = setItems.filter(x=> x.object_type == "Role" && !x.allow).map(PermissionSetCommand.getMention);
        const channelWhitelist = setItems.filter(x=> x.object_type == "Channel" && x.allow).map(PermissionSetCommand.getMention);
        const channelBlacklist = setItems.filter(x=> x.object_type == "Channel" && !x.allow).map(PermissionSetCommand.getMention);
        
        const embed = new MessageEmbed()
            .setTitle(`Permission Set ${psetId}`)
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor)
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
        
        await commandExec.sendAsync(embed);
        
        await commandExec.logDefaultAsync();
    }

    private static deny = async (args: string[], permissionSet: PermissionSetModel, commandExec: CommandExecutionParameters) : Promise<void> => {
        const id = args.shift();
        if (id === undefined) {
            await commandExec.errorAsync('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>');
            return;
        }
        const setItem = PermissionSetCommand.extractPermissionSetItem(commandExec.guild, id);
        if (setItem === undefined){
            await commandExec.errorAsync('Invalid role or channel ID/mention.');
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.PermissionSets.blacklist(commandExec.guild.id, permissionSet.set_id, setItem.object_type, setItem.object_id);

        const mention = PermissionSetCommand.getMention(setItem);
        await commandExec.sendAsync(`${setItem.object_type} ${mention} added to blacklist for permission set ${permissionSet.set_id} (${permissionSet.name})`);
        
        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('Set ID', permissionSet.set_id, true);
        commandLog.addField('Set Name', permissionSet.name, true);
        commandLog.addField('Blacklisted', mention, true);
        await commandExec.logAsync(commandLog);
    }

    private static allow = async (args: string[], permissionSet: PermissionSetModel, commandExec: CommandExecutionParameters) : Promise<void> => {
        const id = args.shift();
        if (id === undefined) {
            await commandExec.errorAsync('Unknown argument.  Please use permissionset <ID> [allow|deny] <role|channel ID/mention>');
            return;
        }
        const setItem = PermissionSetCommand.extractPermissionSetItem(commandExec.guild, id);
        if (setItem === undefined){
            await commandExec.errorAsync('Invalid role or channel ID/mention.');
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.PermissionSets.whitelist(commandExec.guild.id, permissionSet.set_id, setItem.object_type, setItem.object_id);

        const mention = PermissionSetCommand.getMention(setItem);
        await commandExec.sendAsync(`${setItem.object_type} ${mention} added to whitelist for permission set ${permissionSet.set_id} (${permissionSet.name})`);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('Set ID', permissionSet.set_id, true);
        commandLog.addField('Set Name', permissionSet.name, true);
        commandLog.addField('Whitelisted', mention, true);
        await commandExec.logAsync(commandLog);
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