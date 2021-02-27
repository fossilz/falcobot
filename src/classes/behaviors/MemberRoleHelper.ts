import { GuildMember, Role } from "discord.js";

export class MemberRoleHelper {
    public static TryAssignRole = async (member: GuildMember, role: Role): Promise<boolean> => {
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
}