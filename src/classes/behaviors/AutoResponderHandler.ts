import { Message } from "discord.js";
import NodeCache from "node-cache";
import AutoResponderModel from "../dataModels/AutoResponderModel";
import RepositoryFactory from "../RepositoryFactory";
import { PermissionCheckResultType, PermissionSetHandler } from "./PermissionSetHandler";
import { asyncForEach } from "../utils/functions";
import AutoResponderReactionModel from "../dataModels/AutoResponderReactionModel";

class AutoResponderHandler {
    private static _cache: NodeCache;
    private static _semaphore = false;

    public static async AutoRespondAsync(message: Message){
        if (message.guild === null) {
            // Can't have saved autoresponders if not in a guild
            return;
        }
        const responders = await this.GetAutoRespondersAsync(message.guild.id);
        if (responders === undefined || responders.length === 0){
            return;
        }
        await asyncForEach(responders, async (r:AutoResponderModel) => await AutoResponderHandler.AttemptAutoResponseAsync(message, r));
    }

    private static AttemptAutoResponseAsync = async (message: Message, responder: AutoResponderModel) => {
        if (message.guild === null || responder === undefined || responder === null) return;
        if (!responder.enabled || responder.pattern == null) return;
        const regex = AutoResponderHandler.TryParseRegex(responder.pattern);
        if (regex === undefined) return;
        if (!regex.test(message.content)) return;
        const checkResults = await PermissionSetHandler.CheckPermissions(message.guild.id, responder.permissionset_id, message.member, message.channel);
        if (checkResults.result !== PermissionCheckResultType.Pass && checkResults.result !== PermissionCheckResultType.NoPermissions) return;
        // We've matched regex, and passed permission checks
        const repo = await RepositoryFactory.getInstanceAsync();
        const reactions = await repo.AutoResponders.selectReactions(message.guild.id, responder.autoresponder_id);
        await asyncForEach(reactions, async (reaction: AutoResponderReactionModel) => {
            try {
                await message.react(reaction.reaction);
            } catch (err) {
                console.log(err);
            }
        });
        if (responder.message){
            message.channel.send(responder.message);
        }
    }

    private static TryParseRegex = (pattern: string) : RegExp | undefined => {
        try {
            return new RegExp(pattern);
        } catch (err) {
            return;
        }
    }

    private static CacheKey = (guild_id: string) : string => {
        return `AutoResponder_${guild_id}`;
    }

    public static ClearCache = (guild_id: string) => {
        const cacheKey = AutoResponderHandler.CacheKey(guild_id);
        AutoResponderHandler.GetCache().del(cacheKey);
    }

    private static GetAutoRespondersAsync = async (guild_id: string) : Promise<AutoResponderModel[]|undefined> => {
        const cache = AutoResponderHandler.GetCache();
        const cacheKey = AutoResponderHandler.CacheKey(guild_id);
        if (!cache.has(cacheKey)) {
            const repo = await RepositoryFactory.getInstanceAsync();
            const responders = await repo.AutoResponders.selectAll(guild_id);
            cache.set(cacheKey, responders, 300); // Let's try a TTL of 5 minutes to start
            return responders;
        }
        return cache.get<AutoResponderModel[]>(cacheKey);
    }

    private static GetCache() {
        if (!AutoResponderHandler._cache && !AutoResponderHandler._semaphore) {
            AutoResponderHandler._semaphore = true;
            AutoResponderHandler._cache = new NodeCache();
        }
        return AutoResponderHandler._cache;
    }
}

export default AutoResponderHandler;