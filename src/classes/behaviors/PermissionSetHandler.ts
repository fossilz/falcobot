import { DMChannel, GuildMember, NewsChannel, TextChannel } from "discord.js";
import NodeCache from "node-cache";
import { PermissionSetItemModel } from "../dataModels/PermissionSetItemModel";
import PermissionSetModel from "../dataModels/PermissionSetModel";
import RepositoryFactory from "../RepositoryFactory";

// Implemented as a [Flags]-style enum so a failure can contain multiple conditions
export enum PermissionCheckResultType {
    NoPermissions       = 0,        // 0
    Pass                = 1 << 0,   // 1
    FailRoleCheck       = 1 << 1,   // 2
    FailChannelCheck    = 1 << 2,   // 4
    FailMemberCheck     = 1 << 3    // 8
}

export class PermissionCheckResult {
    result: PermissionCheckResultType;
    // reserved for additional runtime parameters, like redirectChannel

    constructor(result: PermissionCheckResultType){
        this.result = result;
    }
}

export class PermissionSetHandler {
    private static _cache: NodeCache;
    private static _semaphore = false;

    public static async CheckPermissions(guild_id: string, permissionset_id: number|null, member?: GuildMember|null, channel?: TextChannel | DMChannel | NewsChannel) : Promise<PermissionCheckResult> {
        if (channel !== undefined && (channel instanceof DMChannel || channel instanceof NewsChannel)) {
            return new PermissionCheckResult(PermissionCheckResultType.FailChannelCheck);
        }
        
        if (permissionset_id === null) {
            return new PermissionCheckResult(PermissionCheckResultType.NoPermissions);
        }
        const pSet = await PermissionSetHandler.GetPermissionSetAsync(guild_id, permissionset_id);
        if (pSet === undefined) {
            return new PermissionCheckResult(PermissionCheckResultType.NoPermissions);
        }
        const setItems = await PermissionSetHandler.GetPermissionSetItemsAsync(guild_id, permissionset_id) || <PermissionSetItemModel[]>[];

        let resultCheck = PermissionCheckResultType.Pass;

        if (!(member?.hasPermission('ADMINISTRATOR'))) {
            resultCheck |= await PermissionSetHandler.CheckRolePermissions(member, pSet, setItems);
            resultCheck |= await PermissionSetHandler.CheckChannelPermissions(channel, pSet, setItems);
        }
        // Add user check (future feature)
        console.log('Permission check for pset: ', permissionset_id, 'member: ', member?.id, `${member?.user.username}#${member?.user.discriminator}`, 'channel: ', channel?.id, channel?.name, "Yielded: ", resultCheck);

        if (resultCheck !== PermissionCheckResultType.Pass) {
            resultCheck &= ~PermissionCheckResultType.Pass; // Remove the Pass bit
        }

        const result = new PermissionCheckResult(resultCheck);
        if ( (resultCheck & PermissionCheckResultType.FailChannelCheck) != 0 ) {
            // Add in code here to set redirectChannel
        }
        return result;
    }

    private static async CheckRolePermissions(member: GuildMember|null|undefined, pSet: PermissionSetModel, setItems: PermissionSetItemModel[]) : Promise<PermissionCheckResultType> {
        if (member === null || member == undefined){
            // No member, don't check this
            return PermissionCheckResultType.Pass;
        }
        if (member.hasPermission('ADMINISTRATOR')) {
            return PermissionCheckResultType.Pass;
        }
        if (pSet.useRoleWhitelist) {
            const whitelist = setItems.filter((x) => x.allow && x.object_type == "Role");
            const matches = whitelist.filter((x) => member.roles.cache.has(x.object_id));
            if (matches.length === 0) {
                // No whitelist matches
                return PermissionCheckResultType.FailRoleCheck;
            }
        }
        const blacklist = setItems.filter((x) => !x.allow && x.object_type == "Role");
        const badRole = blacklist.find((x) => member.roles.cache.has(x.object_id));
        if (badRole !== undefined) {
            // Found a blacklisted role
            return PermissionCheckResultType.FailRoleCheck;
        }
        return PermissionCheckResultType.Pass;
    }

    private static async CheckChannelPermissions(channel: TextChannel | undefined, pSet: PermissionSetModel, setItems: PermissionSetItemModel[]) : Promise<PermissionCheckResultType> {
        if (channel === undefined) {
            return PermissionCheckResultType.Pass;
        }
        if (pSet.useChannelWhitelist) {
            const whitelist = setItems.filter((x) => x.allow && x.object_type == "Channel");
            const matches = whitelist.filter((x) => channel.id == x.object_id);
            if (matches.length === 0) {
                // No whitelist matches
                return PermissionCheckResultType.FailChannelCheck;
            }
        }
        const blacklist = setItems.filter((x) => !x.allow && x.object_type == "Channel");
        const badChannel = blacklist.find((x) => channel.id == x.object_id);
        if (badChannel !== undefined) {
            // Found a blacklisted channel
            return PermissionCheckResultType.FailChannelCheck;
        }
        return PermissionCheckResultType.Pass;
    }

    private static PSetCacheKey = (guild_id: string, permissionset_id: number) : string => {
        return `PermissionSet_${guild_id}_${permissionset_id}`;
    }
    
    private static PSetItemsCacheKey = (guild_id: string, permissionset_id: number) : string => {
        return `PermissionSetItems_${guild_id}_${permissionset_id}`;
    }

    public static ClearCache = (guild_id: string, permissionset_id: number) => {
        const cacheKey = PermissionSetHandler.PSetCacheKey(guild_id, permissionset_id);
        const itemCacheKey = PermissionSetHandler.PSetItemsCacheKey(guild_id, permissionset_id);
        const cache = PermissionSetHandler.GetCache();
        cache.del(cacheKey);
        cache.del(itemCacheKey);
    }

    private static GetPermissionSetAsync = async (guild_id: string, permissionset_id: number) : Promise<PermissionSetModel|undefined> => {
        const cache = PermissionSetHandler.GetCache();
        const cacheKey = PermissionSetHandler.PSetCacheKey(guild_id, permissionset_id);
        if (!cache.has(cacheKey)) {
            const repo = await RepositoryFactory.getInstanceAsync();
            const pSet = await repo.PermissionSets.select(guild_id, permissionset_id);
            cache.set(cacheKey, pSet, 300); // Let's try a TTL of 5 minutes to start
            return pSet;
        }
        return cache.get<PermissionSetModel|undefined>(cacheKey);
    }

    private static GetPermissionSetItemsAsync = async (guild_id: string, permissionset_id: number) : Promise<PermissionSetItemModel[]|undefined> => {
        const cache = PermissionSetHandler.GetCache();
        const cacheKey = PermissionSetHandler.PSetItemsCacheKey(guild_id, permissionset_id);
        if (!cache.has(cacheKey)) {
            const repo = await RepositoryFactory.getInstanceAsync();
            const setItems = await repo.PermissionSets.selectItems(guild_id, permissionset_id) || <PermissionSetItemModel[]>[];
            cache.set(cacheKey, setItems, 300); // Let's try a TTL of 5 minutes to start
            return setItems;
        }
        return cache.get<PermissionSetItemModel[]>(cacheKey);
    }

    private static GetCache() {
        if (!PermissionSetHandler._cache && !PermissionSetHandler._semaphore) {
            PermissionSetHandler._semaphore = true;
            PermissionSetHandler._cache = new NodeCache();
        }
        return PermissionSetHandler._cache;
    }
}