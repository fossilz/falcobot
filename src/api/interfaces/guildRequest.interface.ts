import Repository from "../../classes/Repository";
import GuildModel from "../../classes/dataModels/GuildModel";
import RequestWithGuildMember from "./requestWithGuildMember.interface";

export default interface GuildRequest extends RequestWithGuildMember {
    repo?: Repository;
    guild?: GuildModel;
}