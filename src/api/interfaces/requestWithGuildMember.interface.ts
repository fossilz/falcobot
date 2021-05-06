import GuildMember from "./guildMember.interface";
import RequestWithUser from "./requestWithUser.interface";

export default interface RequestWithGuildMember extends RequestWithUser {
    guildMember?: GuildMember;
}