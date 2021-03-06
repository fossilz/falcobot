import { GuildMember } from "discord.js";
import { MemberNoteModel, NoteType } from "../dataModels/MemberNoteModel";
import Repository from "../Repository";
import RepositoryFactory from "../RepositoryFactory";

export class MemberNoteHelper {
    public static AddUserNote = async(guild_id: string, user_id: string, type: NoteType, text: string, author?: GuildMember) : Promise<MemberNoteSummary> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const memberNote = new MemberNoteModel();
        memberNote.guild_id = guild_id;
        memberNote.user_id = user_id;
        memberNote.type = NoteType[type];
        memberNote.text = text;
        memberNote.author_id = author?.user.id || null;

        await repo.MemberNotes.insert(memberNote);

        return await MemberNoteHelper.GetNoteSummary(repo, guild_id, user_id);
    }

    public static GetNoteSummary = async (repo: Repository, guild_id: string, user_id: string) : Promise<MemberNoteSummary> => {
        const noteList = await repo.MemberNotes.selectAllForUser(guild_id, user_id);
        const summary = new MemberNoteSummary(user_id);
        noteList.forEach((note: MemberNoteModel) => {
            if (note.type == NoteType[NoteType.Note]) summary.noteCount++;
            if (note.type == NoteType[NoteType.Warn]) summary.warnCount++;
            if (note.type == NoteType[NoteType.Mute]) summary.muteCount++;
            if (note.type == NoteType[NoteType.Kick]) summary.kickCount++;
            if (note.type == NoteType[NoteType.Ban]) summary.banCount++;
        });
        return summary;
    }
}

export class MemberNoteSummary {
    public user_id: string;
    public noteCount: number;
    public warnCount: number;
    public muteCount: number;
    public kickCount: number;
    public banCount: number;

    constructor(user_id: string) {
        this.user_id = user_id;
        this.noteCount = 0;
        this.warnCount = 0;
        this.muteCount = 0;
        this.kickCount = 0;
        this.banCount = 0;
    }

    totalNotes = (): number => {
        return this.noteCount + this.warnCount + this.muteCount + this.kickCount + this.banCount;
    }
}