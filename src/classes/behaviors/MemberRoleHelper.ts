import { GuildMember, Role } from "discord.js";
import AutoRoleHandler from "./AutoRoleHandler";

export class MemberRoleHelper {
    public static TryAssignRole = async (member: GuildMember, role: Role): Promise<boolean> => {
        const shouldAllow = await AutoRoleHandler.ShouldAllowRole(member, role);
        if (!shouldAllow){
            return false;
        }
        try {
            await member.roles.add(role);
            return true;
        } catch (err) {
            return false;
        }
    }

    public static TryRemoveRole = async (member: GuildMember, role: Role): Promise<boolean> => {
        try {
            await member.roles.remove(role);
            return true;
        } catch (err) {
            return false;
        }
    }

    public static TryToggleRole = async (member: GuildMember, role: Role): Promise<boolean> => {
        if (member.roles.cache.has(role.id)){
            return await MemberRoleHelper.TryRemoveRole(member, role);
        } else {
            return await MemberRoleHelper.TryAssignRole(member, role);
        }
    }
}