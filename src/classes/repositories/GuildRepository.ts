import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import GuildModel from '../dataModels/GuildModel';
import DbRepository from './DbRepository';

class GuildRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS guilds (
                guild_id TEXT PRIMARY KEY,
                name TEXT,
                ownerID TEXT,
                staffLogChannelID TEXT,
                prefix TEXT DEFAULT "!" NOT NULL
            );
        `);
    }

    insert = async (guild: GuildModel) => await this.db.run(
        'INSERT OR IGNORE INTO guilds (guild_id, name, ownerID, staffLogChannelID, prefix) VALUES (?, ?, ?, ?, ?);', 
        guild.guild_id, 
        guild.name, 
        guild.ownerID, 
        guild.staffLogChannelID,
        guild.prefix
    );

    select = async(guild_id: string) => await this.db.get<GuildModel>('SELECT * FROM guilds WHERE guild_id = ?;', guild_id);
    selectPrefix = async(guild_id: string) => await this.db.get<string>('SELECT prefix FROM guilds WHERE guild_id = ?;', guild_id);

    updateName = async(guild_id: string, name: string) => await this.db.run('UPDATE guilds SET name = ? WHERE guild_id = ?;', name, guild_id);
    updateStaffLogChannel = async(guild_id: string, staffLogChannelID: string|null) => await this.db.run('UPDATE guilds SET staffLogChannelID = ? WHERE guild_id = ?;', staffLogChannelID, guild_id);
    updatePrefix = async(guild_id: string, prefix: string) => await this.db.run('UPDATE guilds SET prefix = ? WHERE guild_id = ?;', prefix, guild_id);

    deleteGuild = async(guild_id: string) => await this.db.run('DELETE FROM guilds WHERE guild_id = ?;', guild_id);
}

export default GuildRepository;