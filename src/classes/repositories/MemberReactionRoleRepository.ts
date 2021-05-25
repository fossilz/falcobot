import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import { NIL as NIL_UUID, v4 as uuidv4 } from 'uuid';
import { MemberReactionRoleModel, MemberReactionRoleQueueItemState } from '../dataModels/MemberReactionRoleModel';
import DbRepository from './DbRepository';

class MemberReactionRoleRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        // Without rowid is an optimization with allows for faster reads/updates in the queue pattern
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS memberReactionRoles (
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                reactionrole_id INTEGER NOT NULL,
                queue_worker_id TEXT NOT NULL,
                last_reaction_state INTEGER DEFAULT 0 NOT NULL,
                reaction_changes INTEGER DEFAULT 1 NOT NULL,
                last_reaction_change_ts INTEGER NOT NULL,
                queue_last_updated INTEGER,
                queue_item_state INTEGER DEFAULT 0 NOT NULL,
                process_attempts INTEGER DEFAULT 0 NOT NULL,
                PRIMARY KEY(guild_id, user_id, reactionrole_id, queue_worker_id)
            ) WITHOUT ROWID;
        `);
    }

    enqueue = async (guild_id: string, user_id: string, reactionrole_id: number, reaction_state: boolean) => {
        const timestamp = (new Date()).getTime();
        await this.db.run(`
            INSERT INTO memberReactionRoles (guild_id, user_id, reactionrole_id, queue_worker_id, last_reaction_state, reaction_changes, last_reaction_change_ts)
            VALUES (:guildid, :userid, :reactionroleid, :queueworkerid, :reactionstate, 1, :changetimestamp)
            ON CONFLICT(guild_id, user_id, reactionrole_id, queue_worker_id) DO UPDATE SET last_reaction_state = :reactionstate, reaction_changes = reaction_changes + 1, last_reaction_change_ts = :changetimestamp;
        `, { ':guildid': guild_id, ':userid': user_id, ':reactionroleid': reactionrole_id, ':queueworkerid': NIL_UUID, ':reactionstate': reaction_state, ':changetimestamp': timestamp });
    };

    dequeue = async (guild_id: string, reactionrole_id: number) : Promise<MemberReactionRoleModel|undefined> => {
        const timestamp = (new Date()).getTime();
        const queue_worker_id = uuidv4();
        await this.db.run(`
            UPDATE memberReactionRoles SET queue_worker_id = :queueworkerid, queue_last_updated = :queuets, queue_item_state = 1
            WHERE guild_id = :guildid AND reactionrole_id = :reactionroleid AND queue_worker_id = :unworkedid
              AND user_id IN (
                SELECT user_id
                FROM memberReactionRoles
                WHERE guild_id = :guildid AND reactionrole_id = :reactionroleid AND queue_worker_id = :unworkedid
                ORDER BY last_reaction_change_ts
                LIMIT 1
              );
        `, { ':guildid': guild_id, ':reactionroleid': reactionrole_id, ':unworkedid': NIL_UUID, ':queuets': timestamp, ':queueworkerid': queue_worker_id });
        // Apparently cannot update and select in the same statement
        const model = await this.db.get<MemberReactionRoleModel>("SELECT * FROM memberReactionRoles WHERE queue_worker_id=?", queue_worker_id);
        return model;
    }
    getUnworkedCount = async (guild_id: string, reactionrole_id: number) : Promise<number> => {
        const result = await this.db.get<{unworkedCount:number}>('SELECT COUNT(*) AS [unworkedCount] FROM memberReactionRoles WHERE guild_id = ? and reactionrole_id = ? AND queue_worker_id = ?', guild_id, reactionrole_id, NIL_UUID);
        return result?.unworkedCount || 0;
    }

    updateQueueItemState = async(guild_id: string, user_id: string, reactionrole_id: number, queue_worker_id: string, queue_item_state: MemberReactionRoleQueueItemState, process_attempts: number) => {
        const timestamp = (new Date()).getTime();
        await this.db.run(`
            UPDATE memberReactionRoles SET queue_last_updated = :queuets, queue_item_state = :queueitemstate, process_attempts = :processattempts
            WHERE guild_id = :guildid AND reactionrole_id = :reactionroleid AND user_id = :userid AND queue_worker_id = :queueworkerid;
        `, { ':guildid': guild_id, ':userid': user_id, ':reactionroleid': reactionrole_id, ':queueworkerid': queue_worker_id, ':queuets': timestamp, ':queueitemstate': queue_item_state, ':processattempts': process_attempts });
    }
    
    delete = async(guild_id: string, user_id: string, reactionrole_id: number, queue_worker_id: string) => await this.db.run('DELETE FROM memberReactionRoles WHERE guild_id = ? AND reactionrole_id = ? AND user_id = ? AND queue_worker_id = ?;', guild_id, reactionrole_id, user_id, queue_worker_id);
    deleteReactionRole = async(guild_id: string, reactionrole_id: number) => await this.db.run('DELETE FROM memberReactionRoles WHERE guild_id = ? AND reactionrole_id = ?;', guild_id, reactionrole_id);
    deleteGuild = async(guild_id: string) => await this.db.run('DELETE FROM memberReactionRoles WHERE guild_id = ?;', guild_id);
}

export default MemberReactionRoleRepository;