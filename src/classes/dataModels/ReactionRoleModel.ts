export default class ReactionRoleModel {
    public guild_id: string;
    public reactionrole_id: number;
    public channel_id: string;
    public message_id: string;
    public emoji: string;
    public role_id: string;
    public permissionset_id: number|null;
}