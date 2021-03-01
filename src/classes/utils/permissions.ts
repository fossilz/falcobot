import { PermissionString } from "discord.js";

class PermissionMetadata {
	public permission: PermissionString;
    public description: string;
    public showWhois: boolean;
    public showRoleInfo: boolean;
    public sortOrder: number;

    constructor(permission: PermissionString, description: string, showWhois: boolean, showRoleInfo: boolean, sortOrder: number) {
		this.permission = permission;
        this.description = description;
        this.showWhois = showWhois;
        this.showRoleInfo = showRoleInfo;
        this.sortOrder = sortOrder;
    }
}

export default {
    'ADMINISTRATOR'        : new PermissionMetadata('ADMINISTRATOR', 'Administrator', true, true, 1),
    'MANAGE_GUILD'         : new PermissionMetadata('MANAGE_GUILD', 'Manage Server', true, true, 2),
    'VIEW_AUDIT_LOG'       : new PermissionMetadata('VIEW_AUDIT_LOG', 'View Audit Log', true, true, 3),
    'VIEW_GUILD_INSIGHTS'  : new PermissionMetadata('VIEW_GUILD_INSIGHTS', 'View Server Insights', true, true, 4),
    'MENTION_EVERYONE'     : new PermissionMetadata('MENTION_EVERYONE', 'Mention Everyone', true, true, 5),
    'MANAGE_ROLES'         : new PermissionMetadata('MANAGE_ROLES', 'Manage Roles', true, true, 6),
    'MANAGE_CHANNELS'      : new PermissionMetadata('MANAGE_CHANNELS', 'Manage Channels', true, true, 7),
    'MANAGE_WEBHOOKS'      : new PermissionMetadata('MANAGE_WEBHOOKS', 'Manage Webhooks', true, true, 8),
    'MANAGE_EMOJIS'        : new PermissionMetadata('MANAGE_EMOJIS', 'Manage Emojis', true, true, 9),
    'MANAGE_MESSAGES'      : new PermissionMetadata('MANAGE_MESSAGES', 'Manage Messages', true, true, 10),
    'MANAGE_NICKNAMES'     : new PermissionMetadata('MANAGE_NICKNAMES', 'Manage Nicknames', true, true, 11),
    'BAN_MEMBERS'          : new PermissionMetadata('BAN_MEMBERS', 'Ban members', true, true, 12),
    'KICK_MEMBERS'         : new PermissionMetadata('KICK_MEMBERS', 'Kick members', true, true, 13),
    'MOVE_MEMBERS'         : new PermissionMetadata('MOVE_MEMBERS', 'Move Members', true, true, 14),
    'MUTE_MEMBERS'         : new PermissionMetadata('MUTE_MEMBERS', 'Mute Members', true, true, 15),
    'DEAFEN_MEMBERS'       : new PermissionMetadata('DEAFEN_MEMBERS', 'Deafen Members', true, true, 16),
    'SEND_TTS_MESSAGES'    : new PermissionMetadata('SEND_TTS_MESSAGES', 'Send TTS Messages', true, true, 17),
    'CREATE_INSTANT_INVITE': new PermissionMetadata('CREATE_INSTANT_INVITE', 'Create instant invite', false, false, 18),
    'ADD_REACTIONS'        : new PermissionMetadata('ADD_REACTIONS', 'Add Reactions', false, false, 19),
    'PRIORITY_SPEAKER'     : new PermissionMetadata('PRIORITY_SPEAKER', 'Priority Speaker', false, true, 20),
    'STREAM'               : new PermissionMetadata('STREAM', 'Stream', false, false, 21),
    'VIEW_CHANNEL'         : new PermissionMetadata('VIEW_CHANNEL', 'View Channel', false, false, 22),
    'SEND_MESSAGES'        : new PermissionMetadata('SEND_MESSAGES', 'Send Messages', false, false, 23),
    'EMBED_LINKS'          : new PermissionMetadata('EMBED_LINKS', 'Embed Links', false, true, 24),
    'ATTACH_FILES'         : new PermissionMetadata('ATTACH_FILES', 'Attach Files', false, true, 25),
    'READ_MESSAGE_HISTORY' : new PermissionMetadata('READ_MESSAGE_HISTORY', 'Read Message History', false, true, 26),
    'USE_EXTERNAL_EMOJIS'  : new PermissionMetadata('USE_EXTERNAL_EMOJIS', 'Use external emojis', false, false, 27),
    'CONNECT'              : new PermissionMetadata('CONNECT', 'Connect', false, false, 28),
    'SPEAK'                : new PermissionMetadata('SPEAK', 'Speak', false, false, 29),
    'USE_VAD'              : new PermissionMetadata('USE_VAD', 'Use Voice Activity Detection', false, false, 30),
    'CHANGE_NICKNAME'      : new PermissionMetadata('CHANGE_NICKNAME', 'Change Nickname', false, true, 31)
};