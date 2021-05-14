import { Guild, GuildChannel, Message, MessageEmbed, Role, TextChannel } from "discord.js";
import moment from "moment";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import { CachedMessageCollectionModel, MessageCollectionCache } from "../../cache/MessageCollectionCache";
import MessageCollectionModel from "../../dataModels/MessageCollectionModel";
import MessageCollectionItemModel from "../../dataModels/MessageCollectionItemModel";
import { MessageCollectionHandler } from "../../behaviors/MessageCollectionHandler";

export class MessageCollectionCommand extends Command {
    public static readonly CommandName: string = 'messagecollection';

    constructor(){
        super({
            name: MessageCollectionCommand.CommandName,
            aliases: ['mc'],
            childCommands: [
                MessageCollectionCreateCommand.CommandName,
                MessageCollectionListCommand.CommandName,
                MessageCollectionDetailsCommand.CommandName,
                MessageCollectionAddItemCommand.CommandName,
                MessageCollectionUpdateCommand.CommandName,
                MessageCollectionReactCommand.CommandName,
                MessageCollectionStickyCommand.CommandName,
                MessageCollectionDeleteCommand.CommandName,
                MessageCollectionPreviewCommand.CommandName,
                MessageCollectionPublishCommand.CommandName,
                MessageCollectionCheckCommand.CommandName
            ],
            category: 'admin',
            usage: 'messagecollection create|list|<message collection ID>',
            description: 'Sets up message collections that can be edited, previewed, and published',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection create #channel :emoji: @Role multiReact', 'messagecollection list', 'messagecollection 15'],
            logByDefault: true
        });
    }
    
    run = async (message: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {

        const initialParam = args.shift();
        if (initialParam === undefined) {
            await commandExec.sendAsync('This should have a syntax helper, but it doesn\'t yet');
            return;
        }
        switch (initialParam) {
            case 'create':
                await this.runChildCommandAsync(MessageCollectionCreateCommand.CommandName, message, args, commandExec);
                return;
            case 'list':
                await this.runChildCommandAsync(MessageCollectionListCommand.CommandName, message, args, commandExec);
                return;
        }
        const messageCollectionId = parseInt(initialParam);
        if (isNaN(messageCollectionId)) {
            await commandExec.errorAsync(`Invalid syntax.  Proper syntax is: messagecollection <message collection ID> [subcommand]`);
            return;
        }
        const messageCollection = await MessageCollectionCache.GetMessageCollectionAsync(commandExec.guild.id, messageCollectionId);
        if (messageCollection === undefined) {
            await commandExec.errorAsync(`Invalid message collection ID.`);
            return;
        }
        const messageCollectionIdString = '' + messageCollectionId;
        const secondParam = args.shift();
        if (secondParam === undefined) {
            await this.runChildCommandAsync(MessageCollectionDetailsCommand.CommandName, message, [ messageCollectionIdString ], commandExec);
            return;
        }
        switch(secondParam) {
            case 'add':
            case 'content':
            case 'addbefore':
            case 'contentbefore':
                const allowReact = secondParam.startsWith('add') ? '1' : '0';
                const insert = secondParam.endsWith('before');
                const insertBefore = (insert ? args.shift() : "-1") || "-1";
                await this.runChildCommandAsync(MessageCollectionAddItemCommand.CommandName, message, [ messageCollectionIdString, allowReact, insertBefore ].concat(args), commandExec);
                return;
            case 'update':
                await this.runChildCommandAsync(MessageCollectionUpdateCommand.CommandName, message,  [ messageCollectionIdString ].concat(args), commandExec);
                return;
            case 'react':
                await this.runChildCommandAsync(MessageCollectionReactCommand.CommandName, message,  [ messageCollectionIdString ].concat(args), commandExec);
                return;
            case 'sticky':
                await this.runChildCommandAsync(MessageCollectionStickyCommand.CommandName, message,  [ messageCollectionIdString ].concat(args), commandExec);
                return;
            case 'delete':
                await this.runChildCommandAsync(MessageCollectionDeleteCommand.CommandName, message, [ messageCollectionIdString ].concat(args), commandExec);
                return;
            case 'preview':
                await this.runChildCommandAsync(MessageCollectionPreviewCommand.CommandName, message, [ messageCollectionIdString ].concat(args), commandExec);
                return;
            case 'publish':
                await this.runChildCommandAsync(MessageCollectionPublishCommand.CommandName, message, [ messageCollectionIdString ], commandExec);
                return;
            case 'check':
                await this.runChildCommandAsync(MessageCollectionCheckCommand.CommandName, message, [ messageCollectionIdString ], commandExec);
                return;
        }
        await commandExec.sendAsync('Invalid messagecollection syntax.  Please see `help messagecollection` for more details.');
        return;
    }
}

class MessageCollectionIdentifier {
    public messageCollectionId: number;
    public messageCollection: CachedMessageCollectionModel;

    constructor(messageCollection: CachedMessageCollectionModel){
        this.messageCollection = messageCollection;
        this.messageCollectionId = messageCollection.messageCollection.messageCollectionId;
    }
}
class MessageCollectionGetModel {
    public messageCollection: MessageCollectionIdentifier;
    public success: boolean;
    public errorMessage: string;

    constructor(success: boolean, errorMessage?: string){
        this.success = success;
        if (errorMessage !== undefined) this.errorMessage = errorMessage;
    }

    public static getMessageCollectionAsync = async (guildId: string, messageCollectionId: number): Promise<MessageCollectionGetModel> => {
        if (isNaN(messageCollectionId)) {
            return new MessageCollectionGetModel(false, "Invalid message collection ID.");
        }
        const messageCollection = await MessageCollectionCache.GetMessageCollectionAsync(guildId, messageCollectionId);
        if (messageCollection === undefined) {
            return new MessageCollectionGetModel(false, "Invalid message collection ID.");
        }
        const result = new MessageCollectionGetModel(true);
        result.messageCollection = new MessageCollectionIdentifier(messageCollection);
        return result;
    }
}

class MessageCollectionItemIdentifier extends MessageCollectionIdentifier {
    public messageItemIndex: number;
    public messageItem: MessageCollectionItemModel;

    constructor(messageCollection: CachedMessageCollectionModel, messageItem: MessageCollectionItemModel) {
        super(messageCollection);
        this.messageItem = messageItem;
        this.messageItemIndex = messageItem.sortIndex;
    }
}
class MessageCollectionItemGetModel {
    public messageCollectionItem: MessageCollectionItemIdentifier;
    public success: boolean;
    public errorMessage: string;

    constructor(success: boolean, errorMessage?: string){
        this.success = success;
        if (errorMessage !== undefined) this.errorMessage = errorMessage;
    }

    public static getMessageCollectionItemAsync = async (guildId: string, messageCollectionId: number, messageItemIndex: number): Promise<MessageCollectionItemGetModel> => {
        const mcGet = await MessageCollectionGetModel.getMessageCollectionAsync(guildId, messageCollectionId);
        if (!mcGet.success) {
            return new MessageCollectionItemGetModel(false, mcGet.errorMessage);
        }
        const messageCollection = mcGet.messageCollection.messageCollection;

        if (isNaN(messageItemIndex)) {
            return new MessageCollectionItemGetModel(false, "Invalid message index.");
        }
        const messageItem = messageCollection.items.find(x => x.sortIndex === messageItemIndex);
        if (messageItem === undefined) {
            return new MessageCollectionItemGetModel(false, "Invalid message index.");
        }
        const result = new MessageCollectionItemGetModel(true);
        result.messageCollectionItem = new MessageCollectionItemIdentifier(messageCollection, messageItem);
        return result;
    }
}
class MessageCollectionOperationResult {
    public success: boolean;
    public message: string;

    constructor(success: boolean, message: string){
        this.success = success;
        this.message = message;
    }
}

export class MessageCollectionCreateCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.create';
    
    constructor(){
        super({
            name: MessageCollectionCreateCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection create <channel ID/mention> [<emoji> <role ID/mention> [multiReact]]',
            description: 'Sets up a message collection on provided channel, with optional reaction role configuration',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['messagecollection create #channel :emoji: @Role multiReact'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const aLen = args.length;
        if (aLen !== 1 && aLen !== 3 && aLen !== 4) {
            await commandExec.errorAsync('Invalid add syntax.  Proper syntax is: messagecollection create <channel ID/mention> [<emoji> <role ID/mention> [multiReact]]');
            return;
        }

        const channelArg = args.shift();
        if (channelArg === undefined) {
            await commandExec.errorAsync('Invalid add syntax.  Proper syntax is: messagecollection create <channel ID/mention> [<emoji> <role ID/mention> [multiReact]]');
            return;
        }
        const channel = Command.extractChannelMention(commandExec.guild, channelArg);
        if (channel === undefined) {
            await commandExec.errorAsync('Invalid channel.');
            return;
        }
        const createParams = new MessageCollectionCreateParams(channel);
        if (aLen > 1){
            const emojiArg = args.shift();
            const roleArg = args.shift();
            const emoji = Command.extractEmoji(commandExec.guild, emojiArg || "");
            if (emoji === undefined) {
                await commandExec.errorAsync('Invalid emoji.');
                return;
            }
            const role = Command.extractRoleMention(commandExec.guild, roleArg || "");
            if (role === undefined) {
                await commandExec.errorAsync('Invalid role.');
                return;
            }
            createParams.emoji = emoji;
            createParams.role = role;
            createParams.multiReact = aLen === 4 && args.shift() === "multiReact";
        }
        const messageCollectionId = await MessageCollectionCreateCommand.createAsync(createParams);
        if (messageCollectionId === undefined){
            await commandExec.errorAsync('Error while attempting to create message collection');
            return;
        }
        await commandExec.sendAsync(`Message Collection ${messageCollectionId} created.`);

        await commandExec.logDefaultAsync();
    }

    public static createAsync = async (createParams: MessageCollectionCreateParams) => {
        const guildId = createParams.channel.guild.id;
        const repo = await RepositoryFactory.getInstanceAsync();
        const now = moment().utc();
        const newMC = new MessageCollectionModel();
        newMC.guild_id = guildId;
        newMC.channel = createParams.channel.id;
        newMC.emoji = createParams.emoji;
        newMC.role = createParams.role?.id || null;
        newMC.multiReact = createParams.multiReact;
        newMC.lastUpdatedUtc = now.toISOString();
        newMC.lastPublishedUtc = null;
        newMC.requiresPublish = false;
        const messageCollectionId = await repo.MessageCollections.insert(newMC);
        MessageCollectionCache.ClearCache(guildId);
        return messageCollectionId;
    }
}

class MessageCollectionCreateParams {
    public channel: GuildChannel;
    public emoji: string|null;
    public role: Role|null;
    public multiReact: boolean;

    constructor(channel: GuildChannel){
        this.channel = channel;
        this.emoji = null;
        this.role = null;
        this.multiReact = false;
    }
}

export class MessageCollectionListCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.list';
    
    constructor(){
        super({
            name: MessageCollectionListCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection list',
            description: 'Lists all message collections',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection list'],
            logByDefault: false
        });
    }

    run = async (_: Message, __: string[], commandExec: CommandExecutionParameters) : Promise<void> => {

        const listEmbed = new MessageEmbed()
            .setTitle('Message Collections')
            .setTimestamp();

        const messageCollections = await MessageCollectionCache.GetMessageCollectionsAsync(commandExec.guild.id);
        if (messageCollections === undefined || messageCollections.length === 0) {
            listEmbed.setDescription('No message collections found.  Use `messagecollection create` to add a new message collection.');
            await commandExec.sendAsync(listEmbed);
            return;
        }

        const mColls = messageCollections.map(x => MessageCollectionDetailsCommand.getDetails(commandExec.guild,x));
        mColls.forEach(x => {
            listEmbed.addField(`Message Collection ${x.messageCollectionId}`,this.format(x));
        });
        await commandExec.sendAsync(listEmbed);
        await commandExec.logDefaultAsync();
    }

    format = (detailModel: MessageCollectionDetailsModel) : string => {
        const roleDesc = detailModel.reactionRole?.toString() || "";
        const channelName = detailModel.channel === undefined ? "[Unknown Channel]" : `<#${detailModel.channel.id}>`;
        
        return `${detailModel.requiresPublish ? "**NEEDS PUBLISH** " : ""}${detailModel.messageCount} message${detailModel.messageCount === 1 ? '' : 's'} in ${channelName}${roleDesc}`;
    }
}

export class MessageCollectionDetailsCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.details';
    
    constructor(){
        super({
            name: MessageCollectionDetailsCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID>',
            description: 'Details on message collection',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        const getIden = await MessageCollectionGetModel.getMessageCollectionAsync(commandExec.guild.id, messageCollectionId);
        if (!getIden.success){
            await commandExec.errorAsync(getIden.errorMessage);
            return;
        }
        const messageCollection = getIden.messageCollection.messageCollection;
        const details = MessageCollectionDetailsCommand.getDetails(commandExec.guild, messageCollection);
        
        const detailEmbed = new MessageEmbed()
            .setTitle(`Message Collection ${details.messageCollectionId}`)
            .setTimestamp()
            .addField('Channel', details.channel, true)
            .addField('Messages', details.messageCount, true)
            .addField('Req Publish', details.requiresPublish ? "**Yes**" : "No", true);
        if (details.reactionRole !== null){
            detailEmbed.addField('Assigns', details.reactionRole.role, true);
            detailEmbed.addField('on Reaction', details.reactionRole.emoji, true);
            detailEmbed.addField('Multi React', details.reactionRole.multiReact ? "Yes" : "No", true);
        }
        detailEmbed.addField('Last Updated', details.lastUpdatedUtc, true);
        detailEmbed.addField('Last Published', details.lastPublishedUtc, true);
        details.itemPreviews.sort((x,y)=> x.index - y.index).forEach(x => {
            const fieldHeader = `${x.index}${x.react ? ' [react]' : ''}${x.sticky ? ' [sticky]' : ''}${x.pendingDelete ? ' [pending delete]' : ''}`;
            detailEmbed.addField(fieldHeader, x.content);
        });
        
        await commandExec.sendAsync(detailEmbed);

        await commandExec.logDefaultAsync();
    }

    public static getDetails = (guild: Guild, mc: CachedMessageCollectionModel) : MessageCollectionDetailsModel => {
        const detailsModel = new MessageCollectionDetailsModel(mc);
        detailsModel.channel = guild.channels.cache.get(mc.messageCollection.channel);
        if (mc.messageCollection.emoji !== null && mc.messageCollection.role !== null) {
            const role = guild.roles.cache.get(mc.messageCollection.role);
            if (role != undefined) {
                detailsModel.reactionRole = new MessageCollectionDetailsReactionRoleModel(mc.messageCollection.emoji, role, mc.messageCollection.multiReact);
            }
        }
        return detailsModel;
    }
}

class MessageCollectionDetailsModel {
    public messageCollectionId: number;
    public channel: GuildChannel|undefined;
    public messageCount: number;
    public requiresPublish: boolean;
    public lastUpdatedUtc: string;
    public lastPublishedUtc: string | null;
    public reactionRole: MessageCollectionDetailsReactionRoleModel|null;
    public itemPreviews: MessageCollectionDetailsItemPreviewModel[];

    constructor(mc: CachedMessageCollectionModel){
        this.messageCollectionId = mc.messageCollection.messageCollectionId;
        this.messageCount = mc.items.length;
        this.requiresPublish = mc.messageCollection.requiresPublish;
        this.reactionRole = null;
        this.lastUpdatedUtc = mc.messageCollection.lastUpdatedUtc;
        this.lastPublishedUtc = mc.messageCollection.lastPublishedUtc;
        this.itemPreviews = mc.items.map(x => new MessageCollectionDetailsItemPreviewModel(x));
    }
}

class MessageCollectionDetailsReactionRoleModel {
    public emoji: string;
    public role: Role;
    public multiReact: boolean;

    constructor(emoji: string, role: Role, multiReact: boolean) {
        this.emoji = emoji;
        this.role = role;
        this.multiReact = multiReact;
    }

    public toString():string {
        return ` assigns ${this.role} with ${this.emoji} ${this.multiReact ? "multiple " : ""}reaction${this.multiReact ? "s" : ""}`;
    }
}

class MessageCollectionDetailsItemPreviewModel {
    public index: number;
    public content: string;
    public react: boolean;
    public sticky: boolean;
    public pendingDelete: boolean;

    constructor(item: MessageCollectionItemModel) {
        this.index = item.sortIndex;
        this.react = item.allowReact && true;
        this.sticky = item.maintainLast && true;
        this.pendingDelete = item.pendingDelete && true;
        this.content = this.truncateString(item.content, 40);
    }

    truncateString(str: string, num: number) {
        if (str.length <= num){
            return str;
        }
        return str.slice(0, num) + "...";
    }
}

export class MessageCollectionAddItemCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.additem';
    
    constructor(){
        super({
            name: MessageCollectionAddItemCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID> add|content|addbefore|contentbefore [before index] <content>',
            description: 'Adds message content to the collection',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15 add This is a message that\'s going to be maintained by the collection'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        const getIden = await MessageCollectionGetModel.getMessageCollectionAsync(commandExec.guild.id, messageCollectionId);
        if (!getIden.success){
            await commandExec.errorAsync(getIden.errorMessage);
            return;
        }
        const addParams = new MessageCollectionAddItemParams(commandExec.guild.id, getIden.messageCollection.messageCollectionId);
        const allowReactString = args.shift();
        if (allowReactString === undefined) {
            await this.badSyntax(commandExec);
            return;
        }
        addParams.allowReact = allowReactString === "1";
        const insertBeforeString = args.shift();
        if (insertBeforeString === undefined) {
            await this.badSyntax(commandExec);
            return;
        }
        const insertBefore = parseInt(insertBeforeString);
        if (!isNaN(insertBefore) && insertBefore > 0){
            addParams.insertBefore = insertBefore;
        }
        const content = args.join(' ');
        if (content.length === 0) {
            await this.badSyntax(commandExec);
            return;
        }
        addParams.content = content;
        await MessageCollectionAddItemCommand.addItemAsync(addParams);
        await commandExec.sendAsync(`Message Collection Item added.`);

        await commandExec.logDefaultAsync();
    }

    badSyntax = async(commandExec: CommandExecutionParameters) => {
        await commandExec.errorAsync(`Invalid syntax.  Proper syntax is: messagecollection <message collection ID> add|content|addbefore|contentbefore [before index] <content>`);
    }

    public static addItemAsync = async(addParams: MessageCollectionAddItemParams) => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const now = moment().utc();
        const messageCollection = await MessageCollectionCache.GetMessageCollectionAsync(addParams.guildId, addParams.messageCollectionId);
        if (messageCollection === undefined) {
            return;
        }
        const sortIndices = messageCollection.items.map(x => x.sortIndex).sort((x,y) => (y - x)); // Sort Descending
        const nextIndex = sortIndices.length === 0 ? 1 : (sortIndices[0] + 1);
        const newItem = new MessageCollectionItemModel();
        newItem.guild_id = addParams.guildId;
        newItem.messageCollectionId = addParams.messageCollectionId;
        newItem.sortIndex = addParams.insertBefore === null ? nextIndex : addParams.insertBefore;
        newItem.allowReact = addParams.allowReact;
        newItem.content = addParams.content;
        newItem.maintainLast = false;
        newItem.pendingDelete = false;
        newItem.publishedMessageId = null;
        newItem.lastUpdatedUtc = now.toISOString();
        await repo.MessageCollections.insertItem(newItem);
        MessageCollectionCache.ClearCache(addParams.guildId);
    }
}

class MessageCollectionAddItemParams {
    guildId: string;
    messageCollectionId: number;
    allowReact: boolean;
    insertBefore: number|null;
    content: string;

    constructor(guildId: string, messageCollectionId: number) {
        this.guildId = guildId;
        this.messageCollectionId = messageCollectionId;
        this.insertBefore = null;
    }
}

export class MessageCollectionUpdateCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.update';
    
    constructor(){
        super({
            name: MessageCollectionUpdateCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID> update <index> <content>',
            description: 'Updates the content of a message in the collection',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15 update 2 This is the new text of the second message in this collection.'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        const messageItemIndex = parseInt(args.shift() || "");
        const content = args.join(" ");
        if (content.length === 0){
            await commandExec.errorAsync(`Invalid syntax.  Proper syntax is: ${this.usage}`);
            return;
        }
        const updateItemParams = new MessageCollectionUpdateItemParams(commandExec.guild.id, messageCollectionId, messageItemIndex);
        updateItemParams.content = content;
        const result = await MessageCollectionUpdateCommand.updateMessageItemAsync(updateItemParams);
        if (!result.success){
            await commandExec.errorAsync(result.message);
            return;
        }
        await commandExec.sendAsync(result.message);
        
        await commandExec.logDefaultAsync();
    }

    public static updateMessageItemAsync = async(updateParams: MessageCollectionUpdateItemParams) : Promise<MessageCollectionOperationResult> => {
        const getModel = await MessageCollectionItemGetModel.getMessageCollectionItemAsync(updateParams.guildId, updateParams.messageCollectionId, updateParams.messageItemIndex);
        if (!getModel.success){
            return new MessageCollectionOperationResult(false, getModel.errorMessage);
        }
        const messageCollectionItem = getModel.messageCollectionItem.messageItem;
        if (messageCollectionItem.pendingDelete){
            return new MessageCollectionOperationResult(false, "Cannot update a message pending delete.  Publish to remove this message.");
        }
        const updateMessages: string[] = [];
        if (updateParams.content !== undefined){
            updateMessages.push("content updated");
            messageCollectionItem.content = updateParams.content;
        }
        if (updateParams.allowReact !== undefined){
            updateMessages.push("reactions " + updateParams.allowReact ? "enabled" : "disabled");
            messageCollectionItem.allowReact = updateParams.allowReact;
        }
        if (updateParams.maintainLast !== undefined){
            updateMessages.push("sticky " + updateParams.maintainLast ? "enabled" : "disabled");
            messageCollectionItem.maintainLast = updateParams.maintainLast;
        }
        if (updateMessages.length === 0){
            return new MessageCollectionOperationResult(false, "No updates pending.");
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const now = moment().utc();
        messageCollectionItem.lastUpdatedUtc = now.toISOString();
        await repo.MessageCollections.updateItem(messageCollectionItem);
        MessageCollectionCache.ClearCache(updateParams.guildId);
        const resultMessage = `Message Item ${messageCollectionItem.sortIndex} in collection ${messageCollectionItem.messageCollectionId} updated: ${updateMessages.join(", ")}.  Publish required.`;
        return new MessageCollectionOperationResult(true, resultMessage);
    }
}

class MessageCollectionUpdateItemParams {
    guildId: string;
    messageCollectionId: number;
    messageItemIndex: number;
    allowReact: boolean|undefined;
    maintainLast: boolean|undefined;
    content: string|undefined;

    constructor(guildId: string, messageCollectionId: number, messageItemIndex: number) {
        this.guildId = guildId;
        this.messageCollectionId = messageCollectionId;
        this.messageItemIndex = messageItemIndex;
    }
}

export class MessageCollectionReactCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.react';
    
    constructor(){
        super({
            name: MessageCollectionReactCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID> react <index>',
            description: 'Toggles whether the message allows reactions for role assignment',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15 react 2'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        const messageItemIndex = parseInt(args.shift() || "");
        const getModel = await MessageCollectionItemGetModel.getMessageCollectionItemAsync(commandExec.guild.id, messageCollectionId, messageItemIndex);
        if (!getModel.success){
            await commandExec.errorAsync(getModel.errorMessage);
            return;
        }
        const newReactState = !(getModel.messageCollectionItem.messageItem.allowReact);
        
        const updateItemParams = new MessageCollectionUpdateItemParams(commandExec.guild.id, messageCollectionId, messageItemIndex);
        updateItemParams.allowReact = newReactState;
        const result = await MessageCollectionUpdateCommand.updateMessageItemAsync(updateItemParams);
        if (!result.success){
            await commandExec.errorAsync(result.message);
            return;
        }
        await commandExec.sendAsync(result.message);
        
        await commandExec.logDefaultAsync();
    }
}

export class MessageCollectionStickyCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.sticky';
    
    constructor(){
        super({
            name: MessageCollectionStickyCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID> sticky <index>',
            description: 'Toggles whether the message attempts to stay at the bottom of the channel',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15 sticky 2'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        const messageItemIndex = parseInt(args.shift() || "");
        const getModel = await MessageCollectionItemGetModel.getMessageCollectionItemAsync(commandExec.guild.id, messageCollectionId, messageItemIndex);
        if (!getModel.success){
            await commandExec.errorAsync(getModel.errorMessage);
            return;
        }
        const newStickyState = !(getModel.messageCollectionItem.messageItem.maintainLast);

        // TODO: Add in extra logic for sticky messages being last in sort
        
        const updateItemParams = new MessageCollectionUpdateItemParams(commandExec.guild.id, messageCollectionId, messageItemIndex);
        updateItemParams.maintainLast = newStickyState;
        const result = await MessageCollectionUpdateCommand.updateMessageItemAsync(updateItemParams);
        if (!result.success){
            await commandExec.errorAsync(result.message);
            return;
        }
        await commandExec.sendAsync(result.message);
        
        await commandExec.logDefaultAsync();
    }
}

export class MessageCollectionDeleteCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.delete';
    
    constructor(){
        super({
            name: MessageCollectionDeleteCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID> delete [index]',
            description: 'Deletes a message from a collection or the entire collection',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15 delete', 'messagecollection 15 delete 2'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        const messageItemIndex = parseInt(args.shift() || "");
        const deleteParams = new MessageCollectionDeleteParams(commandExec.guild.id, messageCollectionId, messageItemIndex);
        const result = await MessageCollectionDeleteCommand.deleteAsync(deleteParams);

        if (!result.success){
            await commandExec.errorAsync(result.message);
            return;
        }
        await commandExec.sendAsync(result.message);
        
        await commandExec.logDefaultAsync();
    }

    public static deleteAsync = async(deleteParams: MessageCollectionDeleteParams) : Promise<MessageCollectionOperationResult> => {
        if (deleteParams.messageItemIndex === undefined){
            return MessageCollectionDeleteCommand.deleteMessageCollectionAsync(deleteParams.guildId, deleteParams.messageCollectionId);
        }
        return MessageCollectionDeleteCommand.deleteMessageCollectionItemAsync(deleteParams.guildId, deleteParams.messageCollectionId, deleteParams.messageItemIndex);
    }

    public static deleteMessageCollectionAsync = async(guildId: string, messageCollectionId: number) : Promise<MessageCollectionOperationResult> => {
        const getIden = await MessageCollectionGetModel.getMessageCollectionAsync(guildId, messageCollectionId);
        if (!getIden.success){
            return new MessageCollectionOperationResult(false, getIden.errorMessage);
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.MessageCollections.delete(guildId, messageCollectionId);
        MessageCollectionCache.ClearCache(guildId);
        return new MessageCollectionOperationResult(true, `Message Collection ${messageCollectionId} deleted.`);
    }

    public static deleteMessageCollectionItemAsync = async(guildId: string, messageCollectionId: number, messageItemIndex: number) : Promise<MessageCollectionOperationResult> => {
        const getModel = await MessageCollectionItemGetModel.getMessageCollectionItemAsync(guildId, messageCollectionId, messageItemIndex);
        if (!getModel.success){
            return new MessageCollectionOperationResult(false, getModel.errorMessage);
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.MessageCollections.softDeleteMessageItem(guildId, messageCollectionId, getModel.messageCollectionItem.messageItem.messageCollectionItemId);
        MessageCollectionCache.ClearCache(guildId);
        return new MessageCollectionOperationResult(true, `Message Collection ${messageCollectionId} index ${messageItemIndex} marked for deletion.  Publish is required to see changes.`);
    }
}

class MessageCollectionDeleteParams {
    guildId: string;
    messageCollectionId: number;
    messageItemIndex: number|undefined;

    constructor(guildId: string, messageCollectionId: number, messageItemIndex: number|undefined) {
        this.guildId = guildId;
        this.messageCollectionId = messageCollectionId;
        if (messageItemIndex !== undefined && !isNaN(messageItemIndex)) {
            this.messageItemIndex = messageItemIndex;
        }
    }
}

export class MessageCollectionPreviewCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.preview';
    
    constructor(){
        super({
            name: MessageCollectionPreviewCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID> preview <channel ID/mention>',
            description: 'Prints the message collection to the desired channel',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15 preview #test-output-channel'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        const previewChannelString = args.shift();
        if (previewChannelString === undefined){
            await commandExec.errorAsync(`Invalid syntax.  Proper syntax is: ${this.usage}`);
            return;
        }
        const previewChannel = Command.extractChannelMention(commandExec.guild, previewChannelString) || commandExec.guild.channels.cache.get(previewChannelString);
        if (previewChannel === undefined || !(previewChannel instanceof TextChannel)) {
            await commandExec.errorAsync("Invalid preview channel provided.");
            return;
        }
        const previewParams = new MessageCollectionPreviewParams(commandExec.guild.id, messageCollectionId, previewChannel);

        const result = await MessageCollectionPreviewCommand.previewAsync(previewParams);

        if (!result.success){
            await commandExec.errorAsync(result.message);
            return;
        }
        await commandExec.sendAsync(result.message);
        
        await commandExec.logDefaultAsync();
    }

    public static previewAsync = async(previewParams: MessageCollectionPreviewParams) : Promise<MessageCollectionOperationResult> => {
        const getIden = await MessageCollectionGetModel.getMessageCollectionAsync(previewParams.guildId, previewParams.messageCollectionId);
        if (!getIden.success){
            return new MessageCollectionOperationResult(false, getIden.errorMessage);
        }
        const mcItems = getIden.messageCollection.messageCollection.items.filter(x => !x.pendingDelete).sort((x,y) => x.sortIndex - y.sortIndex);
        for(let i = 0; i < mcItems.length; i++){
            const content = MessageCollectionHandler.GetMessageCollectionItemContent(mcItems[i]);
            await previewParams.channel.send(content);
        }
        return new MessageCollectionOperationResult(true, `Preview printed to <#${previewParams.channel.id}>`);
    }
}

class MessageCollectionPreviewParams {
    guildId: string;
    messageCollectionId: number;
    channel: TextChannel;

    constructor(guildId: string, messageCollectionId: number, channel: TextChannel) {        
        this.guildId = guildId;
        this.messageCollectionId = messageCollectionId;
        this.channel = channel;
    }
}

export class MessageCollectionPublishCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.publish';
    
    constructor(){
        super({
            name: MessageCollectionPublishCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID> publish',
            description: 'Publishes the message collection, updating and reposting messages as necessary',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15 publish'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        if (isNaN(messageCollectionId)) {
            await commandExec.errorAsync(`Invalid syntax.  Proper syntax is: messagecollection <message collection ID> publish`);
            return;
        }
        const messageCollection = await MessageCollectionCache.GetMessageCollectionAsync(commandExec.guild.id, messageCollectionId);
        if (messageCollection === undefined) {
            await commandExec.errorAsync(`Invalid message collection ID.`);
            return;
        }
        var publishParams = new MessageCollectionPublishParams(commandExec.guild, messageCollectionId);
        await MessageCollectionPublishCommand.publishAsync(publishParams);
        await commandExec.sendAsync(`Message Collection ${messageCollectionId} published.`);

        await commandExec.logDefaultAsync();
    }

    public static publishAsync = async (publishParams: MessageCollectionPublishParams) => {
        const messageCollection = await MessageCollectionCache.GetMessageCollectionAsync(publishParams.guild.id, publishParams.messageCollectionId);
        if (messageCollection === undefined) {
            return;
        }
        await MessageCollectionHandler.PublishMessageCollectionAsync(publishParams.guild, messageCollection);
    }
}

class MessageCollectionPublishParams {
    guild: Guild;
    messageCollectionId: number;

    constructor(guild: Guild, messageCollectionId: number) {
        this.guild = guild;
        this.messageCollectionId = messageCollectionId;
    }
}


export class MessageCollectionCheckCommand extends Command {
    public static readonly CommandName: string = 'messagecollection.check';
    
    constructor(){
        super({
            name: MessageCollectionCheckCommand.CommandName,
            parentCommand: MessageCollectionCommand.CommandName,
            category: 'admin',
            usage: 'messagecollection <message collection ID> check',
            description: 'Checks if sticky messages are last',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_MESSAGES'],
            examples: ['messagecollection 15 check'],
            logByDefault: true
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const messageCollectionId = parseInt(args.shift() || "");
        if (isNaN(messageCollectionId)) {
            await commandExec.errorAsync(`Invalid syntax.  Proper syntax is: ${this.usage}`);
            return;
        }
        const messageCollection = await MessageCollectionCache.GetMessageCollectionAsync(commandExec.guild.id, messageCollectionId);
        if (messageCollection === undefined) {
            await commandExec.errorAsync(`Invalid message collection ID.`);
            return;
        }

        await MessageCollectionHandler.MessageCollectionMaintainLastAsync(commandExec.guild, messageCollection);
    }
}

export const MessageCollectionCommands: Command[] = [
    new MessageCollectionCommand(),
    new MessageCollectionCreateCommand(),
    new MessageCollectionListCommand(),
    new MessageCollectionDetailsCommand(),
    new MessageCollectionAddItemCommand(),
    new MessageCollectionUpdateCommand(),
    new MessageCollectionReactCommand(),
    new MessageCollectionStickyCommand(),
    new MessageCollectionDeleteCommand(),
    new MessageCollectionPreviewCommand(),
    new MessageCollectionPublishCommand(),
    new MessageCollectionCheckCommand()
];