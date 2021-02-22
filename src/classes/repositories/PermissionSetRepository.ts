import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import PermissionSetModel from '../dataModels/PermissionSetModel';
import PermissionSetItemModel from '../dataModels/PermissionSetItemModel';
import DbRepository from './DbRepository';

class PermissionSetRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS permissionSets (
                guild_id TEXT,
                set_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                useRoleWhitelist INTEGER DEFAULT 0 NOT NULL,
                useChannelWhitelist INTEGER DEFAULT 0 NOT NULL
            );

            CREATE TABLE IF NOT EXISTS permissionSetItems (
                guild_id TEXT,
                permissionset_id INTEGER NOT NULL,
                permissionsetitem_id INTEGER PRIMARY KEY AUTOINCREMENT,
                object_id TEXT NOT NULL,
                object_type TEXT NOT NULL,
                allow INTEGER DEFAULT 0 NOT NULL,
                UNIQUE(guild_id,permissionset_id,object_id)
            );
        `);
    }

    insert = async (guild_id: string, name: string) : Promise<number|undefined> => {
        var result = await this.db.run(
            'INSERT OR IGNORE INTO permissionSets (guild_id, name, useRoleWhitelist, useChannelWhitelist) VALUES (?, ?, 0, 0);', 
            guild_id, 
            name
        );
        return result.lastID
    }

    select = async(guild_id: string, set_id: number) => await this.db.get<PermissionSetModel>('SELECT * FROM permissionSets WHERE guild_id = ? AND set_id = ?;', guild_id, set_id);
    selectAll = async(guild_id: string) => await this.db.get<PermissionSetModel>('SELECT * FROM permissionSets WHERE guild_id = ?;', guild_id);
    selectItems = async(guild_id: string, set_id: number) => await this.db.get<PermissionSetItemModel>('SELECT * FROM permissionSetItems WHERE guild_id = ? AND permissionset_id = ?;', guild_id, set_id);

    updateName = async (guild_id: string, set_id: number, name: string) => await this.db.run(
        'UPDATE permissionSets SET name = ? WHERE guild_id = ? AND set_id = ?;',
        name,
        guild_id, 
        set_id
    );

    whitelist = async(guild_id: string, set_id: number, object_type: string, object_id: string) => {
        if (object_type == 'role'){
            await this.db.run('UPDATE permissionSets SET useRoleWhitelist = 1 WHERE guild_id = ? AND set_id = ?;', guild_id, set_id);
        }
        if (object_type == 'channel'){
            await this.db.run('UPDATE permissionSets SET useChannelWhitelist = 1 WHERE guild_id = ? AND set_id = ?;', guild_id, set_id);
        }
        await this.db.run(`
            INSERT OR REPLACE INTO permissionSetItems (guild_id, permissionset_id, object_id, object_type, allow)
            VALUES (:guildid, :setid, :oid, :otype, 1);
        `, { ':guildid': guild_id, ':setid': set_id, ':otype': object_type, ':oid': object_id });
    }
    blacklist = async(guild_id: string, set_id: number, object_type: string, object_id: string) => {
        await this.db.run(`
            INSERT OR REPLACE INTO permissionSetItems (guild_id, permissionset_id, object_id, object_type, allow)
            VALUES (:guildid, :setid, :oid, :otype, 1);
        `, { ':guildid': guild_id, ':setid': set_id, ':otype': object_type, ':oid': object_id });
        await this.removeWhitelists(guild_id, set_id);
    }
    removeWhitelists = async(guild_id: string, set_id: number) =>
        await this.db.run(`
            UPDATE permissionSets SET useRoleWhitelist = 0 WHERE guild_id = :guildid AND set_id = :setid
            AND NOT EXISTS (SELECT 1 FROM permissionSetItems WHERE guild_id = :guildid AND permissionset_id = :setid AND object_type = 'role' AND allow = 1);
            UPDATE permissionSets SET useChannelWhitelist = 0 WHERE guild_id = :guildid AND set_id = :setid
            AND NOT EXISTS (SELECT 1 FROM permissionSetItems WHERE guild_id = :guildid AND permissionset_id = :setid AND object_type = 'channel' AND allow = 1);
        `, { ':guildid': guild_id, ':setid': set_id});

    delete = async(guild_id: string, set_id: number) => 
        await this.db.run(`
            DELETE FROM permissionSetItems WHERE guild_id = :guildid AND set_id = :setid;
            DELETE FROM permissionSets WHERE guild_id = :guildid AND set_id = :setid;
        `, { ':guildid': guild_id, ':setid': set_id});
    deleteSetItem = async(guild_id: string, set_id: number, permissionsetitem_id: number) => 
        await this.db.run(`
            DELETE FROM permissionSetItems WHERE guild_id = ? AND set_id = ? AND permissionsetitem_id = ?;
        `, guild_id, set_id, permissionsetitem_id);
    deleteGuild = async(guild_id: string) => 
        await this.db.run(`
            DELETE FROM permissionSetItems WHERE guild_id = :guildid;
            DELETE FROM permissionSets WHERE guild_id = :guildid;
        `, { ':guildid': guild_id });
}

export default PermissionSetRepository;