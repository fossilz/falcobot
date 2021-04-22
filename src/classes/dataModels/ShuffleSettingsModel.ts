export default class ShuffleSettingsModel {
    public guild_id: string;
    public enabled: boolean;
    public announce_channel_id: string;
    public ping_role_id: string|null;
    public warning_seconds: number|null;
    public prepare_message: string;
    public start_message: string;
    public warn_message: string;
    public randomize_url: boolean;
}