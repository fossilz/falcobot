export default class MessageCollectionItemModel {
    public guild_id: string;
    public messageCollectionId: number;
    public messageCollectionItemId: number;
    public sortIndex: number;
    public allowReact: boolean;
    public content: string;
    public publishedMessageId: string|null;
    public maintainLast: boolean;
    public lastUpdatedUtc: string;
    public pendingDelete: boolean;
}