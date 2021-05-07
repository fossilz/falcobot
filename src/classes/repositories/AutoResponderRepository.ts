import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import AutoResponderModel from '../dataModels/AutoResponderModel';
import AutoResponderReactionModel from '../dataModels/AutoResponderReactionModel';
import DbRepository from './DbRepository';

class AutoResponderRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS autoResponders (
                guild_id TEXT,
                autoresponder_id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT NOT NULL,
                enabled INTEGER DEFAULT 0 NOT NULL,
                permissionset_id INTEGER,
                message TEXT
            );

            CREATE TABLE IF NOT EXISTS autoResponderReactions (
                guild_id TEXT,
                autoresponder_id INTEGER NOT NULL,
                autoresponderreaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
                reaction TEXT
            );
        `);
    }

    insert = async (guild_id: string, autoResponder: AutoResponderModel) : Promise<number|undefined> => {
        var result = await this.db.run(
            'INSERT OR IGNORE INTO autoResponders (guild_id, pattern, enabled, permissionset_id, message) VALUES (?, ?, ?, ?, ?);', 
            guild_id, 
            autoResponder.pattern,
            autoResponder.enabled,
            autoResponder.permissionset_id,
            autoResponder.message
        );
        return result.lastID
    }

    select = async(guild_id: string, autoresponder_id: number) => await this.db.get<AutoResponderModel>('SELECT * FROM autoResponders WHERE guild_id = ? AND autoresponder_id = ?;', guild_id, autoresponder_id);
    selectAll = async(guild_id: string) => await this.db.all<AutoResponderModel[]>('SELECT * FROM autoResponders WHERE guild_id = ?;', guild_id);
    selectReactions = async(guild_id: string, autoresponder_id: number) => await this.db.all<AutoResponderReactionModel[]>('SELECT * FROM autoResponderReactions WHERE guild_id = ? AND autoresponder_id = ?;', guild_id, autoresponder_id);

    update = async (guild_id: string, autoresponder: AutoResponderModel) => {
        await this.db.run(
            'UPDATE autoResponders SET pattern = :pattern, enabled = :enabled, permissionset_id = :permissionsetid, message = :message WHERE guild_id = :guildid AND autoresponder_id = :autoresponderid;',
            {
                ':guildid': guild_id,
                ':autoresponderid': autoresponder.autoresponder_id,
                ':pattern': autoresponder.pattern,
                ':enabled': autoresponder.enabled,
                ':permissionsetid': autoresponder.permissionset_id,
                ':message': autoresponder.message
            });
    }

    addReaction = async(guild_id: string, autoresponder_id: number, reaction: string) => {
        await this.db.run('INSERT INTO autoResponderReactions (guild_id, autoresponder_id, reaction) VALUES (?, ?, ?);', guild_id, autoresponder_id, reaction);
    };
    removeReaction = async(guild_id: string, autoresponderreaction_id: number) => {
        await this.db.run('DELETE FROM autoResponderReactions WHERE guild_id = ? AND autoresponderreaction_id = ?;', guild_id, autoresponderreaction_id);
    };

    delete = async(guild_id: string, autoresponder_id: number) => 
        await this.db.run(`
            DELETE FROM autoResponderReactions WHERE guild_id = :guildid AND autoresponder_id = :autoresponderid;
            DELETE FROM autoResponders WHERE guild_id = :guildid AND autoresponder_id = :autoresponderid;
        `, { ':guildid': guild_id, ':autoresponderid': autoresponder_id});
    deleteReactions = async(guild_id: string, autoresponder_id: number) => 
        await this.db.run(`
            DELETE FROM autoResponderReactions WHERE guild_id = ? AND autoresponder_id = ?;
        `, guild_id, autoresponder_id);
    deleteGuild = async(guild_id: string) => 
        await this.db.run(`
            DELETE FROM autoResponderReactions WHERE guild_id = :guildid;
            DELETE FROM autoResponders WHERE guild_id = :guildid;
        `, { ':guildid': guild_id });
}

export default AutoResponderRepository;