class PermissionSetModel {
    public guild_id: string;
    public set_id: number; // Just to make life easier, this will be an auto-incrementing integer
    public name: string;
    public useRoleWhitelist: boolean;
    public useChannelWhitelist: boolean;
}

export default PermissionSetModel;