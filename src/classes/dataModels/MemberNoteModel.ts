export enum NoteType {
    Note,
    Warn,
    Mute,
    Kick,
    Ban
}

export type NoteTypeStrings = keyof typeof NoteType;

export class MemberNoteModel {
    public guild_id: string;
    public user_id: string;
    public author_id: string|null;
    public timestamp: number;
    public type: string; //NoteTypeStrings; // Can't use the specific for now because of a Typescript issue
    public text: string;

    constructor() {
        this.timestamp = (new Date()).getTime();
    }
}