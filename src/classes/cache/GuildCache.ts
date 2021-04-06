import NodeCache from "node-cache";
import GuildModel from "../dataModels/GuildModel";
import RepositoryFactory from "../RepositoryFactory";

export default class GuildCache {
    private static _cache: NodeCache;
    private static _semaphore = false;

    private static GetCache() {
        if (!GuildCache._cache && !GuildCache._semaphore) {
            GuildCache._semaphore = true;
            GuildCache._cache = new NodeCache();
        }
        return GuildCache._cache;
    }
    
    private static CacheKey = (guild_id: string) : string => {
        return `GuildCache_${guild_id}`;
    }

    public static GetGuildAsync = async (guild_id: string) : Promise<GuildModel|undefined> => {
        const cache = GuildCache.GetCache();
        const cacheKey = GuildCache.CacheKey(guild_id);
        if (!cache.has(cacheKey)){
            const repo = await RepositoryFactory.getInstanceAsync();
            const gm = await repo.Guilds.select(guild_id);
            cache.set(cacheKey, gm, 300);
            return gm;
        }
        return cache.get<GuildModel>(cacheKey);
    }

    public static ClearCache = (guild_id: string) => {
        const cache = GuildCache.GetCache();
        const cacheKey = GuildCache.CacheKey(guild_id);
        cache.del(cacheKey);
    }
}