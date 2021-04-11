import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import MassRoleModel from '../dataModels/MassRoleModel';
import MassRoleMemberModel from '../dataModels/MassRoleMemberModel';
import DbRepository from './DbRepository';

export default class MassRoleRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS massRoles (
                guild_id TEXT NOT NULL,
                massrole_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                bots INTEGER DEFAULT 1 NOT NULL,
                humans INTEGER DEFAULT 1 NOT NULL,
                inRole INTEGER,
                role_id TEXT,
                addRoleIds TEXT,
                removeRoleIds TEXT,
                toggleRoleIds TEXT
            );

            CREATE TABLE IF NOT EXISTS massRoleMembers (
                guild_id TEXT NOT NULL,
                massrole_id INTEGER,
                user_id TEXT NOT NULL,
                PRIMARY KEY(massrole_id,user_id)
            );
        `);
    }

    insert = async (massRoleModel: MassRoleModel) : Promise<number|undefined> => {
        var result = await this.db.run(
            'INSERT OR IGNORE INTO massRoles (guild_id,user_id,bots,humans,inRole,role_id,addRoleIds,removeRoleIds,toggleRoleIds) VALUES (?,?,?,?,?,?,?,?,?);',
            massRoleModel.guild_id,
            massRoleModel.user_id,
            massRoleModel.bots,
            massRoleModel.humans,
            massRoleModel.inRole,
            massRoleModel.role_id,
            massRoleModel.addRoleIds,
            massRoleModel.removeRoleIds,
            massRoleModel.toggleRoleIds
        );
        return result.lastID;
    }

    addUser = async (massRoleMemberModel: MassRoleMemberModel) : Promise<void> => {
        await this.db.run(
            'INSERT OR IGNORE INTO massRoleMembers (guild_id,massrole_id,user_id) VALUES (?,?,?)',
            massRoleMemberModel.guild_id,
            massRoleMemberModel.massrole_id,
            massRoleMemberModel.user_id
        );
    }

    select = async(guild_id: string, massrole_id: number) => await this.db.get<MassRoleModel>('SELECT * FROM massRoles WHERE guild_id = ? and massrole_id = ?', guild_id, massrole_id);
    selectAll = async(guild_id: string) => await this.db.all<MassRoleModel[]>('SELECT * FROM massRoles WHERE guild_id = ?;', guild_id);

    getPendingCount = async (guild_id: string, massrole_id: number) : Promise<number|undefined> => {
        const mr = await this.db.get<MassRoleModel>('SELECT * FROM massRoles WHERE guild_id = ? and massrole_id = ?', guild_id, massrole_id);
        if (mr === undefined) return undefined;
        const result = await this.db.get<{unworkedCount:number}>('SELECT COUNT(*) AS [unworkedCount] FROM massRoleMembers WHERE guild_id = ? and massrole_id = ?', guild_id, massrole_id);
        return result?.unworkedCount || 0;
    }

    dequeueMember = async (guild_id: string, massrole_id: number) : Promise<MassRoleMemberModel|undefined> => {
        const model = await this.db.get<MassRoleMemberModel>("SELECT * FROM massRoleMembers WHERE guild_id = ? and massrole_id = ? LIMIT 1", guild_id, massrole_id);
        if (model !== undefined) {
            await this.db.run('DELETE FROM massRoleMembers WHERE guild_id = ? AND massrole_id = ? AND user_id = ?;', guild_id, massrole_id, model.user_id);
        }
        return model;
    }

    delete = async(guild_id: string, massrole_id: number) => {
        await this.db.run('DELETE FROM massRoleMembers WHERE guild_id = ? AND massrole_id = ?;', guild_id, massrole_id);
        await this.db.run('DELETE FROM massRoles WHERE guild_id = ? AND massrole_id = ?;', guild_id, massrole_id);
    }
    deleteGuild = async(guild_id: string) => {
        await this.db.run('DELETE FROM massRoleMembers WHERE guild_id = ?;', guild_id);
        await this.db.run('DELETE FROM massRoles WHERE guild_id = ?;', guild_id);
    }
}