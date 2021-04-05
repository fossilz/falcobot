import NodeCache from "node-cache";
import RepositoryFactory from "../RepositoryFactory";
import { AutoRoleModel } from "../dataModels/AutoRoleModel";
import { GuildMember, Role } from "discord.js";
import { asyncForEach } from "../utils/functions";
import { MemberRoleHelper } from "./MemberRoleHelper";

export default class AutoRoleHandler {
    private static _cache: NodeCache;
    private static _semaphore = false;

    public static async OnGuildJoin(member: GuildMember) : Promise<void> {
        const guild_id = member.guild.id;
        const autoRoles = await this.GetAutoRolesAsync(guild_id);
        if (autoRoles === undefined || autoRoles.length === 0){
            return;
        }
        const onJoin = autoRoles.filter(x => x.trigger_role_id === null);
        if (onJoin.length === 0) {
            return;
        }
        await asyncForEach(onJoin, async (ar) => {
            await AutoRoleHandler.TryAssignRoleId(member, ar.role_id);
        });
    }

    public static async OnRoleAssigned(member: GuildMember, role: Role) : Promise<void> {
        const guild_id = member.guild.id;
        const autoRoles = await this.GetAutoRolesAsync(guild_id);
        if (autoRoles === undefined || autoRoles.length === 0){
            return;
        }
        const triggeredRoles = autoRoles.filter(x => x.trigger_role_id === role.id && x.trigger_on_add_remove === "ADD");
        if (triggeredRoles.length === 0) {
            return;
        }
        await asyncForEach(triggeredRoles, async (ar) => {
            if (ar.add_remove === "ADD") {
                await AutoRoleHandler.TryAssignRoleId(member, ar.role_id);
            }
            if (ar.add_remove === "REMOVE") {
                await AutoRoleHandler.TryRemoveRoleId(member, ar.role_id);
            }
        });
    }

    public static async OnRoleRemoved(member: GuildMember, role: Role) : Promise<void> {
        const guild_id = member.guild.id;
        const autoRoles = await this.GetAutoRolesAsync(guild_id);
        if (autoRoles === undefined || autoRoles.length === 0){
            return;
        }
        const triggeredRoles = autoRoles.filter(x => x.trigger_role_id === role.id && x.trigger_on_add_remove === "REMOVE");
        if (triggeredRoles.length === 0) {
            return;
        }
        await asyncForEach(triggeredRoles, async (ar) => {
            if (ar.add_remove === "ADD") {
                await AutoRoleHandler.TryAssignRoleId(member, ar.role_id);
            }
            if (ar.add_remove === "REMOVE") {
                await AutoRoleHandler.TryRemoveRoleId(member, ar.role_id);
            }
        });
    }

    // This will be useful for commands which assign roles to bulk users
    public static async ShouldAllowRole(member: GuildMember, role: Role) : Promise<boolean> {
        const guild_id = member.guild.id;
        const autoRoles = await this.GetAutoRolesAsync(guild_id);
        if (autoRoles === undefined || autoRoles.length === 0){
            return true;
        }
        const blockRoles = autoRoles.filter(x => x.role_id === role.id && x.add_remove === "REMOVE" && x.trigger_role_id !== null && x.trigger_on_add_remove === "ADD"); // Roles which remove this role if they're added
        const requiredRoles = autoRoles.filter(x => x.role_id === role.id && x.add_remove === "REMOVE" && x.trigger_role_id !== null && x.trigger_on_add_remove === "REMOVE"); // Roles which remove this role if they're removed
        // No blocking or required roles
        if (blockRoles.length === 0 && requiredRoles.length === 0){
            return true;
        }
        if (blockRoles.filter(br => br.trigger_role_id !== null && member.roles.cache.has(br.trigger_role_id)).length > 0){
            // Member has a blocking role assigned currently
            return false;
        }
        if (requiredRoles.filter(reqRole => reqRole.trigger_role_id !== null && !member.roles.cache.has(reqRole.trigger_role_id)).length > 0){
            // Member is missing a required role
            return false;
        }
        return true;
    }

    private static TryAssignRoleId = async (member: GuildMember, role_id: string|null) : Promise<void> => {
        if (role_id === null) return;
        var role = member.guild.roles.cache.get(role_id);
        if (role === undefined) return;
        if (member.roles.cache.has(role.id)) return;
        await MemberRoleHelper.TryAssignRole(member, role);
    }

    private static TryRemoveRoleId = async (member: GuildMember, role_id: string|null) : Promise<void> => {
        if (role_id === null) return;
        var role = member.guild.roles.cache.get(role_id);
        if (role === undefined) return;
        if (!member.roles.cache.has(role.id)) return;
        await MemberRoleHelper.TryRemoveRole(member, role);
    }
    
    private static CacheKey = (guild_id: string) : string => {
        return `AutoRole_${guild_id}`;
    }

    public static ClearCache = (guild_id: string) => {
        const cacheKey = AutoRoleHandler.CacheKey(guild_id);
        AutoRoleHandler.GetCache().del(cacheKey);
    }

    private static GetAutoRolesAsync = async (guild_id: string) : Promise<AutoRoleModel[]|undefined> => {
        const cache = AutoRoleHandler.GetCache();
        const cacheKey = AutoRoleHandler.CacheKey(guild_id);
        if (!cache.has(cacheKey)) {
            const repo = await RepositoryFactory.getInstanceAsync();
            const autoroles = await repo.AutoRoles.selectAll(guild_id);
            cache.set(cacheKey, autoroles, 300); // Let's try a TTL of 5 minutes to start
            return autoroles;
        }
        return cache.get<AutoRoleModel[]>(cacheKey);
    }

    private static GetCache() {
        if (!AutoRoleHandler._cache && !AutoRoleHandler._semaphore) {
            AutoRoleHandler._semaphore = true;
            AutoRoleHandler._cache = new NodeCache();
        }
        return AutoRoleHandler._cache;
    }
}