import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import ChannelModel from '../dataModels/ChannelModel';
import DbRepository from './DbRepository';

class ChannelRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS channels (
                guild_id TEXT NOT NULL,
                channel_id TEXT PRIMARY KEY,
                name TEXT,
                type TEXT,
                parentID TEXT,
                deleted INTEGER DEFAULT 0 NOT NULL
            );
        `);
    }

    insert = async (channel: ChannelModel) => await this.db.run(
        'INSERT OR IGNORE INTO channels (guild_id, channel_id, name, type, parentID, deleted) VALUES (?, ?, ?, ?, ?, ?);', 
        channel.guild_id,
        channel.channel_id,
        channel.name,
        channel.type,
        channel.parentID,
        channel.deleted
    );

    select = async(channel_id: string) => await this.db.get<ChannelModel>('SELECT * FROM channels WHERE channel_id = ?;', channel_id);

    update = async (channel: ChannelModel) => await this.db.run(
        'UPDATE channels SET name = ?, type = ?, parentID = ?, deleted = ? WHERE guild_id = ? AND channel_id = ?;',
        channel.name,
        channel.type,
        channel.parentID,
        channel.deleted,
        channel.guild_id,
        channel.channel_id
    );

    delete = async(channel_id: string) => await this.db.run('DELETE FROM channels WHERE channel_id = ?;', channel_id);
    deleteGuild = async(guild_id: string) => await this.db.run('DELETE FROM channels WHERE guild_id = ?;', guild_id);
}

export default ChannelRepository;