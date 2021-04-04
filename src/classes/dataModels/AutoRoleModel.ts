export type AddRemoveString = 'ADD' | 'REMOVE';

export class AutoRoleModel {
    public guild_id: string;
    public autorole_id: number;
    public role_id: string;
    public add_remove: AddRemoveString; // Add or Remove Role
    public trigger_role_id: string|null; // Only add or remove if this role is added/removed
    public trigger_on_add_remove: AddRemoveString|null; // Trigger on the Add or Remove of trigger_role
    public trigger_reverse: boolean; // Should this trigger condition reverse?
    public prevent_assign: boolean; // Having roles that would remove this will prevent commands from assigning this role
}