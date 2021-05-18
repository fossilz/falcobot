import { Guild, TextChannel, Message, MessageEmbed, CollectorFilter, MessageReaction, User } from "discord.js";
import moment from "moment";
import { CachedMessageCollectionModel, MessageCollectionCache } from "../cache/MessageCollectionCache";
import MessageCollectionItemModel from "../dataModels/MessageCollectionItemModel";
import MessageCollectionModel from "../dataModels/MessageCollectionModel";
import Repository from "../Repository";
import RepositoryFactory from "../RepositoryFactory";
import { MemberRoleHelper } from "./MemberRoleHelper";

export class MessageCollectionHandler {

    public static PublishMessageCollectionAsync = async(guild: Guild, messageCollection: CachedMessageCollectionModel) => {
        const mcAudit = await MessageCollectionHandler.AuditMessageCollectionAsync(guild, messageCollection);
        if (mcAudit === undefined) return;
        const now = moment().utc();
        const repo = await RepositoryFactory.getInstanceAsync();
        const needsAddRemove = mcAudit.items.filter(x => x.needsAddRemove);
        if (needsAddRemove.length > 0) {
            // Republish the entire collection
            await MessageCollectionHandler.RepostMessageCollectionItemsAsync(mcAudit.channel, messageCollection.items, repo);
            await repo.MessageCollections.setPublished(guild.id, messageCollection.messageCollection.messageCollectionId, now.toISOString());
            MessageCollectionCache.ClearCache(guild.id);
            return;
        }
        const needsPublish = mcAudit.items.filter(x => x.needsPublish);
        if (needsPublish.length === 0) {
            await repo.MessageCollections.setPublished(guild.id, messageCollection.messageCollection.messageCollectionId, now.toISOString());
            MessageCollectionCache.ClearCache(guild.id);
            return;
        }
        const promises = needsPublish.map(x => MessageCollectionHandler.UpdateMessageCollectionItemAsync(x));
        await Promise.all(promises);
        await repo.MessageCollections.setPublished(guild.id, messageCollection.messageCollection.messageCollectionId, now.toISOString());
        MessageCollectionCache.ClearCache(guild.id);
    }

    public static CheckMaintainLastForChannelAsync = async (message: Message) => {
        const channel = message.channel;
        if (!(channel instanceof TextChannel)) return;
        if (message.author.bot) return;
        const guild = channel.guild;
        const messageCollections = await MessageCollectionCache.GetMessageCollectionsAsync(guild.id);
        if (messageCollections === undefined || messageCollections.length == 0) return;
        const publishedInChannel = messageCollections.filter(x => x.messageCollection.lastPublishedUtc !== null && x.messageCollection.channel == channel.id);
        if (publishedInChannel.length === 0) return;
        const maintainTasks = publishedInChannel.map(x => MessageCollectionHandler.MessageCollectionMaintainLastAsync(guild, x));
        await Promise.all(maintainTasks);
    }
    
    // Maintain "last" message status, mark collection needsPublish if anything is missing
    public static MessageCollectionMaintainLastAsync = async(guild: Guild, messageCollection: CachedMessageCollectionModel) => {
        const mcAudit = await MessageCollectionHandler.AuditMessageCollectionAsync(guild, messageCollection);
        if (mcAudit === undefined) return;
        const needsAddRemove = mcAudit.items.filter(x => x.needsAddRemove);
        const repo = await RepositoryFactory.getInstanceAsync();
        if (needsAddRemove.length > 0) {
            await repo.MessageCollections.setNeedsPublish(guild.id, messageCollection.messageCollection.messageCollectionId);
            MessageCollectionCache.ClearCache(guild.id);
        }
        if (messageCollection.messageCollection.lastPublishedUtc === null){
            return; // Don't maintain if it's not published
        }
        const shouldBeLast = mcAudit.items.filter(x => x.item.maintainLast).sort((x,y) => x.item.sortIndex - y.item.sortIndex);
        const lastCount = shouldBeLast.length;
        if (lastCount === 0) return;
        if (shouldBeLast.filter(x => x.message === null).length > 0){
            await MessageCollectionHandler.RepostMessageCollectionItemsAsync(mcAudit.channel, shouldBeLast.map(x => x.item), repo);
            return;
        }
        const messageIds = shouldBeLast.filter(x => x.message !== null).map(x => x.message?.id || null);
        const messagesAfter = await mcAudit.channel.messages.fetch({ after: shouldBeLast[0].message?.id, limit: lastCount + 10 });
        const interlopers = messagesAfter.filter(x => messageIds.find(y => y == x.id) === undefined);
        if (interlopers.size > 0){
            await MessageCollectionHandler.RepostMessageCollectionItemsAsync(mcAudit.channel, shouldBeLast.map(x => x.item), repo);
        }
    }

    private static RepostMessageCollectionItemsAsync = async(channel: TextChannel, items: MessageCollectionItemModel[], repo: Repository) => {
        await MessageCollectionHandler.RemoveExistingMessageCollectionItemsAsync(channel, items, repo);
        const sorted = items.sort((x,y) => x.sortIndex - y.sortIndex);
        for(let i = 0; i < sorted.length; i++){
            const item = items[i];
            await MessageCollectionHandler.PublishMessageCollectionItemAsync(channel, item, repo);
        }
    }

    private static UpdateMessageCollectionItemAsync = async(publishedMessage: PublishedMessage) => {
        if (publishedMessage.message === null) return;
        const content = MessageCollectionHandler.GetMessageCollectionItemContent(publishedMessage.item);
        publishedMessage.message = await publishedMessage.message.edit(content);
        
        const messageCollection = await MessageCollectionCache.GetMessageCollectionAsync(publishedMessage.item.guild_id, publishedMessage.item.messageCollectionId);
        if (messageCollection === undefined) return;
        await MessageCollectionHandler.SetupMessageReactionsAsync(messageCollection, publishedMessage.item, publishedMessage.message);
    }

    private static PublishMessageCollectionItemAsync = async(channel: TextChannel, item: MessageCollectionItemModel, repo: Repository) => {
        if (item.pendingDelete) return;
        const content = MessageCollectionHandler.GetMessageCollectionItemContent(item);
        const newMessage = await channel.send(content);
        await repo.MessageCollections.publishMessageItem(item.guild_id, item.messageCollectionId, item.messageCollectionItemId, newMessage.id);
        MessageCollectionCache.ClearCache(item.guild_id);
        const messageCollection = await MessageCollectionCache.GetMessageCollectionAsync(item.guild_id, item.messageCollectionId);
        if (messageCollection === undefined) return;
        await MessageCollectionHandler.SetupMessageReactionsAsync(messageCollection, item, newMessage);
        // If maintainlast, add the channel listener
    }

    public static GetMessageCollectionItemContent = (item: MessageCollectionItemModel) : MessageEmbed => {
        const contentEmbed = new MessageEmbed()
            .setDescription(item.content)
            .setFooter("Last Updated ")
            .setTimestamp(moment.utc(item.lastUpdatedUtc).toDate());
        return contentEmbed;
    }

    private static RemoveExistingMessageCollectionItemsAsync = async(channel: TextChannel, items: MessageCollectionItemModel[], repo: Repository) => {
        // Sort and delete in reverse order in case there are actual deleted messages and indexes need to be cleaned up
        const mcItems = items.sort((x,y) => y.sortIndex - x.sortIndex);
        for(let i = 0; i < mcItems.length; i++){
            const item = mcItems[i];
            await MessageCollectionHandler.RemoveExistingMessageCollectionItemAsync(channel, item, repo);
        }
    }

    private static RemoveExistingMessageCollectionItemAsync = async(channel: TextChannel, item: MessageCollectionItemModel, repo: Repository) => {
        if (item.publishedMessageId === null){
            // Clean up if it's being deleted
            if (item.pendingDelete) {
                await repo.MessageCollections.deleteMessageItem(item.guild_id, item.messageCollectionId, item.messageCollectionItemId);
                MessageCollectionCache.ClearCache(item.guild_id);
            }
            return;
        }
        const pMessage = channel.messages.cache.get(item.publishedMessageId);
        if (pMessage === undefined || !pMessage.deletable){
            // Clean up if it's being deleted
            if (item.pendingDelete) {
                await repo.MessageCollections.deleteMessageItem(item.guild_id, item.messageCollectionId, item.messageCollectionItemId);
                MessageCollectionCache.ClearCache(item.guild_id);
            }
            return;
        }
        await pMessage.delete();
        if (item.pendingDelete) {
            await repo.MessageCollections.deleteMessageItem(item.guild_id, item.messageCollectionId, item.messageCollectionItemId);
            MessageCollectionCache.ClearCache(item.guild_id);
        }
    }

    private static AuditMessageCollectionAsync = async (guild: Guild, messageCollection: CachedMessageCollectionModel) : Promise<MessageCollectionAudit|undefined> => {
        const channel = guild.channels.cache.get(messageCollection.messageCollection.channel);
        if (channel === undefined || !(channel instanceof TextChannel)) return;
        const tChannel = <TextChannel>channel;
        const publishedMessages = await Promise.all(messageCollection.items.map(x => MessageCollectionHandler.getPublishedMessageAsync(x, tChannel)));
        return new MessageCollectionAudit(messageCollection.messageCollection, tChannel, publishedMessages);
    }

    private static getPublishedMessageAsync = async (mcItem: MessageCollectionItemModel, channel: TextChannel) : Promise<PublishedMessage> => {
        const result = new PublishedMessage(mcItem);
        if (mcItem.publishedMessageId === null) return result;
        const pMessage = await MessageCollectionHandler.tryGetMessageAsync(channel, mcItem.publishedMessageId);
        if (pMessage === undefined) return result;
        result.message = pMessage;
        return result;
    }

    private static tryGetMessageAsync = async (channel: TextChannel, messageId: string) : Promise<Message|undefined> => {
        try {
            return await channel.messages.fetch(messageId);
        } catch (_) {
            return undefined;
        }
    }

    public static SetupGuildMessageReactionsAsync = async(guild: Guild) => {
        const messageCollections = await MessageCollectionCache.GetMessageCollectionsAsync(guild.id);
        if (messageCollections === undefined) return;
        await Promise.all(messageCollections.map(x => MessageCollectionHandler.SetupMessageCollectionReactionsAsync(guild, x)));
    }

    private static SetupMessageCollectionReactionsAsync = async (guild: Guild, messageCollection: CachedMessageCollectionModel) => {
        if (messageCollection.messageCollection.emoji === null || messageCollection.messageCollection.role === null) return;
        const mcAudit = await MessageCollectionHandler.AuditMessageCollectionAsync(guild, messageCollection);
        if (mcAudit === undefined) return;
        const setupPromises = mcAudit.items
                                .filter(x => x.message !== null && x.item.allowReact && !x.item.pendingDelete)
                                .map(x => MessageCollectionHandler.SetupMessageReactionsAsync(messageCollection, x.item, <Message>x.message));
        await Promise.all(setupPromises);
    }

    private static SetupMessageReactionsAsync = async(messageCollection: CachedMessageCollectionModel, item: MessageCollectionItemModel, message: Message) => {
        await message.reactions.removeAll();
        const emoji = messageCollection.messageCollection.emoji;
        if (!item.allowReact || emoji === null || MessageCollectionHandler.isNotLastSingleReactItem(messageCollection, item)) {
            return;
        }
        await message.react(emoji);
        MessageCollectionHandler.CreateMessageReactionCollection(messageCollection, item, message);
    }

    private static CreateMessageReactionCollection = (messageCollection: CachedMessageCollectionModel, item: MessageCollectionItemModel, message: Message) => {
        const collectionFilter: CollectorFilter = (_: MessageReaction, user: User) => {
            return !user.bot;
        }
        const reactionCollector = message.createReactionCollector(collectionFilter);
        reactionCollector.on('collect', async (messageReaction: MessageReaction, user: User) => {
            await MessageCollectionHandler.AssignMessageReactionAsync(messageCollection, item, messageReaction, user);
        });
    }

    private static AssignMessageReactionAsync = async(messageCollection: CachedMessageCollectionModel, item: MessageCollectionItemModel, messageReaction: MessageReaction, user: User) => {
        if (messageReaction.emoji.id !== messageCollection.messageCollection.emoji && messageReaction.emoji.name !== messageCollection.messageCollection.emoji) {
            await messageReaction.remove();
            return;
        }
        await messageReaction.users.remove(user);
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.MessageCollections.insertReaction(item.guild_id, item.messageCollectionId, item.messageCollectionItemId, user.id);
        setImmediate(async () => MessageCollectionHandler.CheckMessageReactionCompleteAsync(messageReaction.message.guild, messageCollection, user, repo));
    }

    private static CheckMessageReactionCompleteAsync = async(guild: Guild|null, messageCollection: CachedMessageCollectionModel, user: User, repo: Repository) => {
        if (guild === null) return;
        const isComplete = await MessageCollectionHandler.IsMessageReactionCompleteAsync(guild, messageCollection, user, repo);
        if (!isComplete) return;
        const guildMember = guild.members.resolve(user);
        if (guildMember === null) return;
        const role = guild.roles.cache.get(messageCollection.messageCollection.role||"");
        if (role === undefined) return;
        await MemberRoleHelper.TryAssignRole(guildMember, role);
        await repo.MessageCollections.deleteReactionsForUser(guild.id, messageCollection.messageCollection.messageCollectionId, user.id);
    }

    private static IsMessageReactionCompleteAsync = async(guild: Guild, messageCollection: CachedMessageCollectionModel, user: User, repo: Repository) : Promise<boolean> => {
        if (!messageCollection.messageCollection.multiReact){
            const lastReact = messageCollection.items.filter(x => x.allowReact && !x.pendingDelete).sort((x,y) => y.sortIndex - x.sortIndex).shift();
            if (lastReact === undefined) return false;
            const mciu = await repo.MessageCollections.selectReaction(lastReact.guild_id, lastReact.messageCollectionId, lastReact.messageCollectionItemId, user.id);
            return mciu !== undefined;
        }
        const hasUnreacted = await repo.MessageCollections.hasUnreactedItems(guild.id, messageCollection.messageCollection.messageCollectionId, user.id);
        return !hasUnreacted;
    }

    private static isNotLastSingleReactItem = (messageCollection: CachedMessageCollectionModel, item: MessageCollectionItemModel) : boolean => {
        if (messageCollection.messageCollection.multiReact) return false;
        const reactAfter = messageCollection.items.filter(x => !x.pendingDelete && x.allowReact && x.sortIndex > item.sortIndex);
        return reactAfter.length > 0;
    }
}

class MessageCollectionAudit {
    public messageCollection: MessageCollectionModel;
    public channel: TextChannel;
    public items: PublishedMessage[];

    constructor(messageCollection: MessageCollectionModel, channel: TextChannel, items: PublishedMessage[]){
        this.messageCollection = messageCollection;
        this.channel = channel;
        this.items = items;
    }
}

class PublishedMessage {
    public item: MessageCollectionItemModel;
    public message: Message|null;

    constructor(item: MessageCollectionItemModel){
        this.item = item;
        this.message = null;
    }

    public get needsAddRemove() : boolean {
        if (this.item.pendingDelete && this.message !== null) return true;
        if (!this.item.pendingDelete && this.message === null) return true;
        return false;
    }

    public get needsPublish() : boolean {
        if (this.item.pendingDelete) return this.message !== null;
        if (this.message === null) return true;
        if (this.message.embeds.length > 0){
            const embed = this.message.embeds[0];
            return embed.description !== this.item.content;
        }
        return this.message.content !== this.item.content;
    }
}