import NodeCache from "node-cache";
import { Command } from "../commands/Command";
import CommandModel from "../dataModels/CommandModel";
import RepositoryFactory from "../RepositoryFactory";
import ReservedCommandList from '../commands';

export class CachedCommandModel {
    public commandModel: CommandModel;
    public reservedCommand: Command|undefined;

    constructor(commandModel: CommandModel){
        this.commandModel = commandModel;
        this.reservedCommand = ReservedCommandList.find((c) => c.name === commandModel.command);
    }
}

export class CommandCache {
    private static _cache: NodeCache;
    private static _semaphore = false;

    private static GetCache() {
        if (!CommandCache._cache && !CommandCache._semaphore) {
            CommandCache._semaphore = true;
            CommandCache._cache = new NodeCache();
        }
        return CommandCache._cache;
    }
    
    private static CacheKey = (guild_id: string) : string => {
        return `CommandCache_${guild_id}`;
    }

    public static GetCommandAsync = async (guild_id: string) : Promise<CachedCommandModel[]|undefined> => {
        const cache = CommandCache.GetCache();
        const cacheKey = CommandCache.CacheKey(guild_id);
        if (!cache.has(cacheKey)){
            const gm = await CommandCache.GetLiveCommandsAsync(guild_id);
            cache.set(cacheKey, gm, 300);
            return gm;
        }
        return cache.get<CachedCommandModel[]>(cacheKey);
    }

    public static GetRootCommandsAsync = async (guild_id: string) : Promise<CachedCommandModel[]|undefined> => {
        const allCommands = await CommandCache.GetCommandAsync(guild_id);
        if (allCommands === undefined) return undefined;
        return allCommands.filter(x => x.reservedCommand === undefined || x.reservedCommand.parentCommand === undefined);
    }

    private static GetLiveCommandsAsync = async (guild_id: string) : Promise<CachedCommandModel[]|undefined> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const gm = await repo.Commands.selectAll(guild_id);
        return gm.map(x => new CachedCommandModel(x));
    }

    public static ClearCache = (guild_id: string) => {
        const cache = CommandCache.GetCache();
        const cacheKey = CommandCache.CacheKey(guild_id);
        cache.del(cacheKey);
    }
}