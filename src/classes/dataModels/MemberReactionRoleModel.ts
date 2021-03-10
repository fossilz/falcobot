export enum MemberReactionRoleQueueItemState {
    Unworked = 0,
    Processing = 1,
    Completed = 2,
    Failed_Retry = 3,
    Failed_Abort = 4
}

export class MemberReactionRoleModel {
    public guild_id: string;
    public user_id: string;
    public reactionrole_id: number;
    public queue_worker_id: string;
    public last_reaction_state: boolean;
    public reaction_changes: number;
    public last_reaction_change_ts: number;
    public queue_last_updated: number|null;
    public queue_item_state: number;
    public process_attempts: number;
}