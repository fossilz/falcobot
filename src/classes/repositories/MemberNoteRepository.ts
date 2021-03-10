import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import { MemberNoteModel } from '../dataModels/MemberNoteModel';
import DbRepository from './DbRepository';

export default class MemberNoteRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS memberNotes (
                guild_id TEXT NOT NULL,
                note_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                author_id TEXT,
                timestamp INTEGER,
                type TEXT NOT NULL,
                text TEXT
            );
        `);
    }

    insert = async (memberNote: MemberNoteModel) => await this.db.run(
        'INSERT OR IGNORE INTO memberNotes (guild_id, user_id, author_id, timestamp, type, text) VALUES (?, ?, ?, ?, ?, ?);', 
        memberNote.guild_id, 
        memberNote.user_id,
        memberNote.author_id,
        memberNote.timestamp,
        memberNote.type,
        memberNote.text
    );

    select = async(guild_id: string, note_id: number) => await this.db.get<MemberNoteModel>('SELECT * FROM memberNotes WHERE guild_id = ? AND note_id = ?;', guild_id, note_id);
    selectAllForUser = async(guild_id: string, user_id: string) => await this.db.all<MemberNoteModel[]>('SELECT * FROM memberNotes WHERE guild_id = ? AND user_id = ?;', guild_id, user_id);
    selectAll = async(guild_id: string) => await this.db.all<MemberNoteModel[]>('SELECT * FROM memberNotes WHERE guild_id = ?;', guild_id);

    delete = async(guild_id: string, note_id: number) => await this.db.run('DELETE FROM memberNotes WHERE guild_id = ? AND note_id = ?;', guild_id, note_id);
    deleteForUser = async(guild_id: string, user_id: string) => await this.db.run('DELETE FROM memberNotes WHERE guild_id = ? AND user_id = ?;', guild_id, user_id);
    deleteGuild = async(guild_id: string) => await this.db.run('DELETE FROM memberNotes WHERE guild_id = ?;', guild_id);
}