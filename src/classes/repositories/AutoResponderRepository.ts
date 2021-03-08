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

    insert = async (guild_id: string, name: string) : Promise<number|undefined> => {
        var result = await this.db.run(
            'INSERT OR IGNORE INTO autoResponders (guild_id, name, useRoleWhitelist, useChannelWhitelist) VALUES (?, ?, 0, 0);', 
            guild_id, 
            name
        );
        return result.lastID
    }

    select = async(guild_id: string, autoresponder_id: number) => await this.db.get<AutoResponderModel>('SELECT * FROM autoResponders WHERE guild_id = ? AND autoresponder_id = ?;', guild_id, autoresponder_id);
    selectAll = async(guild_id: string) => await this.db.all<AutoResponderModel[]>('SELECT * FROM autoResponders WHERE guild_id = ?;', guild_id);
    selectReactions = async(guild_id: string, autoresponder_id: number) => await this.db.all<AutoResponderReactionModel[]>('SELECT * FROM autoResponderReactions WHERE guild_id = ? AND autoresponder_id = ?;', guild_id, autoresponder_id);

    updatePattern = async (guild_id: string, autoresponder_id: number, pattern: string) => await this.db.run('UPDATE autoResponders SET pattern = ? WHERE guild_id = ? AND autoresponder_id = ?;', pattern, guild_id, autoresponder_id);
    updateEnabled = async (guild_id: string, autoresponder_id: number, enabled: boolean) => await this.db.run('UPDATE autoResponders SET enabled = ? WHERE guild_id = ? AND autoresponder_id = ?;', enabled, guild_id, autoresponder_id);
    updatePermissionSet = async(guild_id: string, autoresponder_id: number, permissionset_id: number|null) => await this.db.run('UPDATE autoResponders SET permissionset_id = ? WHERE guild_id = ? AND autoresponder_id = ?;', permissionset_id, guild_id, autoresponder_id);
    updateMessage = async (guild_id: string, autoresponder_id: number, message: string) => await this.db.run('UPDATE autoResponders SET message = ? WHERE guild_id = ? AND autoresponder_id = ?;', message, guild_id, autoresponder_id);

    addReaction = async(guild_id: string, autoresponder_id: number, reaction: string) => {
        await this.db.run('INSERT INTO autoResponderReactions (guild_id, autoresponder_id, reaction) VALUES (?, ?, ?);', guild_id, autoresponder_id, reaction);
    };
    removeReaction = async(guild_id: string, autoresponderreaction_id: number) => {
        await this.db.run('DELETE FROM autoResponderReactions WHERE guild_id = ? AND autoresponderreaction_id = ?;', guild_id, autoresponderreaction_id);
    };

    delete = async(guild_id: string, set_id: number) => 
        await this.db.run(`
            DELETE FROM autoResponderReactions WHERE guild_id = :guildid AND set_id = :setid;
            DELETE FROM autoResponders WHERE guild_id = :guildid AND set_id = :setid;
        `, { ':guildid': guild_id, ':setid': set_id});
    deleteSetItem = async(guild_id: string, set_id: number, permissionsetitem_id: number) => 
        await this.db.run(`
            DELETE FROM autoResponderReactions WHERE guild_id = ? AND set_id = ? AND permissionsetitem_id = ?;
        `, guild_id, set_id, permissionsetitem_id);
    deleteGuild = async(guild_id: string) => 
        await this.db.run(`
            DELETE FROM autoResponderReactions WHERE guild_id = :guildid;
            DELETE FROM autoResponders WHERE guild_id = :guildid;
        `, { ':guildid': guild_id });
}

export default AutoResponderRepository;