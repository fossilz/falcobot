import { GuildMember } from "discord.js";

export default class MemberModel {
    public guild_id: string;
    public user_id: string;
    public user_name: string;
    public user_discriminator: string;
    public bot: boolean;
    public joinedTimestamp: number|null;
    public nickname: string|null;
    public deleted: boolean;  // This way we can retain info if the user leaves

    constructor(member?: GuildMember) {
        this.deleted = false;
        if (member === undefined) return;
        this.guild_id = member.guild.id;
        this.user_id = member.user.id;
        this.user_name = member.user.username;
        this.user_discriminator = member.user.discriminator;
        this.bot = member.user.bot;
        this.joinedTimestamp = member.joinedTimestamp;
        this.nickname = member.nickname;
    }
}