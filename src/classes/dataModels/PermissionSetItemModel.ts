export type PermissionSetItemType = 
    | "Role"
    | "Channel"
    | "User";

export class PermissionSetItemModel {
    public guild_id: string;
    public permissionset_id: number;
    public permissionsetitem_id: number; // Auto-incrementing id
    public object_id: string; // Role, Channel, or User id
    public object_type: PermissionSetItemType; // Role | Channel | User
    public allow: boolean; // True == Whitelist | False == Blacklist
};