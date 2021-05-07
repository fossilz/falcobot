export default class AutoResponderModel {
    public guild_id: string;
    public autoresponder_id: number;
    public pattern: string;
    public enabled: boolean;
    public permissionset_id: number|null;
    public message: string|null;
}