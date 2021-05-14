export default class MessageCollectionModel {
    public guild_id: string;
    public messageCollectionId: number;
    public channel: string;
    public emoji: string|null;
    public role: string|null;
    public multiReact: boolean;
    public lastUpdatedUtc: string;
    public lastPublishedUtc: string|null;
    public requiresPublish: boolean;
}