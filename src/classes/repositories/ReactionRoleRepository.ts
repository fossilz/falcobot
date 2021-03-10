import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import ReactionRoleModel from '../dataModels/ReactionRoleModel';
import DbRepository from './DbRepository';

class ReactionRoleRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS reactionRoles (
                guild_id TEXT NOT NULL,
                reactionrole_id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                message_id TEXT NOT NULL,
                emoji TEXT NOT NULL,
                role_id TEXT NOT NULL,
                permissionset_id INTEGER
            );
        `);
    }

    insert = async (reactionRole: ReactionRoleModel) : Promise<number|undefined> => {
        const result = await this.db.run(
            'INSERT OR IGNORE INTO reactionRoles (guild_id, channel_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?, ?);', 
            reactionRole.guild_id, 
            reactionRole.channel_id,
            reactionRole.message_id,
            reactionRole.emoji,
            reactionRole.role_id
        );
        return result.lastID;
    };

    select = async(guild_id: string, reactionrole_id: number) => await this.db.get<ReactionRoleModel>('SELECT * FROM reactionRoles WHERE guild_id = ? AND reactionrole_id = ?;', guild_id, reactionrole_id);
    selectAll = async(guild_id: string) => await this.db.all<ReactionRoleModel[]>('SELECT * FROM reactionRoles WHERE guild_id = ? ORDER BY channel_id, message_id;', guild_id);

    updatePermissionSet = async(guild_id: string, reactionrole_id: number, permissionset_id: number|null) => await this.db.run('UPDATE reactionRoles SET permissionset_id = ? WHERE guild_id = ? AND reactionrole_id = ?;', permissionset_id, guild_id, reactionrole_id);
    
    delete = async(guild_id: string, reactionrole_id: number) => await this.db.run('DELETE FROM reactionRoles WHERE guild_id = ? AND reactionrole_id = ?;', guild_id, reactionrole_id);
    deleteGuild = async(guild_id: string) => await this.db.run('DELETE FROM reactionRoles WHERE guild_id = ?;', guild_id);
}

export default ReactionRoleRepository;