export default class MassRoleModel {
    public guild_id: string;
    public massrole_id: number;
    public user_id: string;
    public bots: boolean;
    public humans: boolean;
    public inRole: boolean|null;
    public role_id: string|null;
    public roleArgs: string;
}