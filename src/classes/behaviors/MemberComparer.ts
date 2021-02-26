import { GuildMember } from "discord.js";

export enum MemberComparisonResult {
    ValidTarget,
    InvalidTarget,
    CannotTargetSelf,
    CannotTargetBot,
    TargetRankedTooHigh
}

export class MemberComparer {
   
    public static CheckMemberComparison = (member: GuildMember, target: GuildMember | undefined, allowSelf?: boolean, allowBot?: boolean) : MemberComparisonResult => {
        if (target === undefined){
            return MemberComparisonResult.InvalidTarget;
        }
        if (allowSelf !== true && member === target) {
            return MemberComparisonResult.CannotTargetSelf;
        }
        if (allowBot !== true && target == member.guild.me) {
            return MemberComparisonResult.CannotTargetBot;
        }
        if (member.id === member.guild.ownerID) {
            // Nobody outranks the owner!
            return MemberComparisonResult.ValidTarget;
        }
        if (target.hasPermission('ADMINISTRATOR')) {
            // Only owner can execute against an Admin
            return MemberComparisonResult.TargetRankedTooHigh;
        }
        if (member.hasPermission('ADMINISTRATOR')) {
            // Admin can execute against any roles, regardless of rank hierarchy
            return MemberComparisonResult.ValidTarget;
        }
        if (target.roles.highest.position >= member.roles.highest.position) {
            return MemberComparisonResult.TargetRankedTooHigh;
        }
        return MemberComparisonResult.ValidTarget;
    }
}