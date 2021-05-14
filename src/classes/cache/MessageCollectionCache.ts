import NodeCache from "node-cache";
import RepositoryFactory from "../RepositoryFactory";
import MessageCollectionModel from '../dataModels/MessageCollectionModel';
import MessageCollectionItemModel from '../dataModels/MessageCollectionItemModel';

export class CachedMessageCollectionModel {
    public messageCollection: MessageCollectionModel;
    public items: MessageCollectionItemModel[];

    constructor(messageCollection: MessageCollectionModel, allItems: MessageCollectionItemModel[]){
        this.messageCollection = messageCollection;
        this.items = allItems.filter(x => x.messageCollectionId == messageCollection.messageCollectionId);
    }
}

export class MessageCollectionCache {
    private static _cache: NodeCache;
    private static _semaphore = false;

    private static GetCache() {
        if (!MessageCollectionCache._cache && !MessageCollectionCache._semaphore) {
            MessageCollectionCache._semaphore = true;
            MessageCollectionCache._cache = new NodeCache();
        }
        return MessageCollectionCache._cache;
    }
    
    private static CacheKey = (guild_id: string) : string => {
        return `MessageCollectionCache_${guild_id}`;
    }

    public static GetMessageCollectionsAsync  = async (guild_id: string) : Promise<CachedMessageCollectionModel[]|undefined> => {
        const cache = MessageCollectionCache.GetCache();
        const cacheKey = MessageCollectionCache.CacheKey(guild_id);
        if (!cache.has(cacheKey)){
            const messageCollections = await MessageCollectionCache.GetLiveMessageCollectionsAsync(guild_id);
            cache.set(cacheKey, messageCollections, 300);
            return messageCollections;
        }
        return cache.get<CachedMessageCollectionModel[]>(cacheKey);
    }

    public static GetMessageCollectionAsync  = async (guild_id: string, messageCollectionId: number) : Promise<CachedMessageCollectionModel|undefined> => {
        const collections = await MessageCollectionCache.GetMessageCollectionsAsync(guild_id);
        if (collections === undefined || collections.length === 0) return;
        return collections.find(x => x.messageCollection.messageCollectionId === messageCollectionId);
    }

    private static GetLiveMessageCollectionsAsync = async (guild_id: string) : Promise<CachedMessageCollectionModel[]|undefined> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const messageCollections = await repo.MessageCollections.selectAll(guild_id);
        const mcItems = await repo.MessageCollections.selectAllItems(guild_id);
        return messageCollections.map(x => new CachedMessageCollectionModel(x, mcItems));
    }

    public static ClearCache = (guild_id: string) => {
        const cache = MessageCollectionCache.GetCache();
        const cacheKey = MessageCollectionCache.CacheKey(guild_id);
        cache.del(cacheKey);
    }
}