import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import { AutoRoleModel } from '../dataModels/AutoRoleModel';
import DbRepository from './DbRepository';

class AutoRoleRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS autoRoles (
                guild_id TEXT NOT NULL,
                autorole_id INTEGER PRIMARY KEY AUTOINCREMENT,
                role_id TEXT NOT NULL,
                add_remove TEXT NOT NULL,
                trigger_role_id TEXT,
                trigger_on_add_remove TEXT,
                trigger_reverse INTEGER,
                prevent_assign INTEGER
            );
        `);
    }

    insert = async (autoRole: AutoRoleModel) : Promise<number|undefined> => {
        var result = await this.db.run(
            'INSERT OR IGNORE INTO autoRoles (guild_id, role_id, add_remove, trigger_role_id, trigger_on_add_remove, trigger_reverse, prevent_assign) VALUES (?, ?, ?, ?, ?, 0, 1);', 
            autoRole.guild_id, 
            autoRole.role_id,
            autoRole.add_remove,
            autoRole.trigger_role_id,
            autoRole.trigger_on_add_remove
        );
        return result.lastID;
    }

    select = async(guild_id: string, autorole_id: number) => await this.db.get<AutoRoleModel>('SELECT * FROM autoRoles WHERE guild_id = ? AND autorole_id = ?;', guild_id, autorole_id);
    selectAll = async(guild_id: string) => await this.db.all<AutoRoleModel[]>('SELECT * FROM autoRoles WHERE guild_id = ?;', guild_id);
    //selectForRole = async(guild_id: string, role_id: string) => await this.db.all<AutoRoleModel[]>('SELECT * FROM autoRoles WHERE guild_id = ? AND role_id = ?;', guild_id, role_id);
    //selectForTrigger = async(guild_id: string, trigger_role_id: string) => await this.db.all<AutoRoleModel[]>('SELECT * FROM autoRoles WHERE guild_id = ? AND trigger_role_id = ?;', guild_id, trigger_role_id);

    updateReverse = async (guild_id: string, autorole_id: number, trigger_reverse: number) => await this.db.run('UPDATE autoRoles SET trigger_reverse = ? WHERE guild_id = ? AND autorole_id = ?;', trigger_reverse, guild_id, autorole_id);
    updatePrevent = async (guild_id: string, autorole_id: number, prevent_assign: number) => await this.db.run('UPDATE autoRoles SET prevent_assign = ? WHERE guild_id = ? AND autorole_id = ?;', prevent_assign, guild_id, autorole_id);

    delete = async(guild_id: string, autorole_id: number) => 
        await this.db.run(`
            DELETE FROM autoRoles WHERE guild_id = :guildid AND autorole_id = :autoroleid;
        `, { ':guildid': guild_id, ':autoroleid': autorole_id});
    deleteRole = async(guild_id: string, role_id: number) => {
        await this.db.run(`
            DELETE FROM autoRoles WHERE guild_id = :guildid AND role_id = :roleid;
        `, { ':guildid': guild_id, ':roleid': role_id});
        await this.db.run(`
            DELETE FROM autoRoles WHERE guild_id = :guildid AND trigger_role_id = :roleid;
        `, { ':guildid': guild_id, ':roleid': role_id});
    }
    deleteGuild = async(guild_id: string) => 
        await this.db.run(`
            DELETE FROM autoRoles WHERE guild_id = :guildid;
        `, { ':guildid': guild_id });
}

export default AutoRoleRepository;