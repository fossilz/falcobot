import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import DbRepository from './DbRepository';
import ShuffleSettingsModel from '../dataModels/ShuffleSettingsModel';
import ShuffleHistoryModel from '../dataModels/ShuffleHistoryModel';

export default class ShuffleRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS shuffleSettings (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0 NOT NULL,
                announce_channel_id TEXT NOT NULL,
                ping_role_id TEXT,
                warning_seconds INTEGER,
                prepare_message TEXT NOT NULL,
                start_message TEXT NOT NULL,
                warn_message TEXT NOT NULL,
                randomize_url INTEGER DEFAULT 1 NOT NULL
            );

            CREATE TABLE IF NOT EXISTS shuffleHistory (
                lotteryId TEXT PRIMARY KEY,
                lotteryStartDate TEXT NOT NULL,
                lotteryEndDate TEXT NOT NULL,
                lotteryDrawDate TEXT NOT NULL,
                sellingStartDate TEXT NOT NULL,
                sellingEndDate TEXT NOT NULL,
                drawInterval TEXT NOT NULL,
                lotteryItems TEXT NOT NULL
            );
        `);
    }

    insertSettings = async (settings: ShuffleSettingsModel) : Promise<number|undefined> => {
        var result = await this.db.run(
            'INSERT OR IGNORE INTO shuffleSettings (guild_id, enabled, announce_channel_id, ping_role_id, warning_seconds, prepare_message, start_message, warn_message, randomize_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);', 
            settings.guild_id, 
            settings.enabled,
            settings.announce_channel_id,
            settings.ping_role_id,
            settings.warning_seconds,
            settings.prepare_message,
            settings.start_message,
            settings.warn_message,
            settings.randomize_url
        );
        return result.lastID;
    }
    insertOrReplaceHistory = async (history: ShuffleHistoryModel) : Promise<void> => {
        await this.db.run(
            'INSERT OR REPLACE INTO shuffleHistory (lotteryId, lotteryStartDate, lotteryEndDate, lotteryDrawDate, sellingStartDate, sellingEndDate, drawInterval, lotteryItems) VALUES (?, ?, ?, ?, ?, ?, ?, ?);', 
            history.lotteryId,
            history.lotteryStartDate,
            history.lotteryEndDate,
            history.lotteryDrawDate,
            history.sellingStartDate,
            history.sellingEndDate,
            history.drawInterval,
            history.lotteryItems // JSON
        );
    }

    selectSettings = async(guild_id: string) => await this.db.get<ShuffleSettingsModel>('SELECT * FROM shuffleSettings WHERE guild_id = ?;', guild_id);
    selectLottery = async(lotteryId: string) => await this.db.get<ShuffleHistoryModel>('SELECT * FROM shuffleHistory WHERE lotteryId = ?;', lotteryId);
    selectHistory = async(limit: number, offset: number) => await this.db.all<ShuffleHistoryModel[]>('SELECT * FROM shuffleHistory ORDER BY lotteryStartDate DESC LIMIT ? OFFSET ?;', limit, offset);

    updateEnabled = async (guild_id: string, enabled: boolean) => await this.db.run('UPDATE shuffleSettings SET enabled = ? WHERE guild_id = ?;', enabled, guild_id);
    updateAnnounceChannel = async (guild_id: string, announce_channel_id: string) => await this.db.run('UPDATE shuffleSettings SET announce_channel_id = ? WHERE guild_id = ?;', announce_channel_id, guild_id);
    updatePingRole = async (guild_id: string, ping_role_id: string|null) => await this.db.run('UPDATE shuffleSettings SET ping_role_id = ? WHERE guild_id = ?;', ping_role_id, guild_id);
    updateWarningSeconds = async (guild_id: string, warning_seconds: number) => await this.db.run('UPDATE shuffleSettings SET warning_seconds = ? WHERE guild_id = ?;', warning_seconds, guild_id);
    updatePrepareMessage = async (guild_id: string, prepare_message: string) => await this.db.run('UPDATE shuffleSettings SET prepare_message = ? WHERE guild_id = ?;', prepare_message, guild_id);
    updateStartMessage = async (guild_id: string, start_message: string) => await this.db.run('UPDATE shuffleSettings SET start_message = ? WHERE guild_id = ?;', start_message, guild_id);
    updateWarnMessage = async (guild_id: string, warn_message: string) => await this.db.run('UPDATE shuffleSettings SET warn_message = ? WHERE guild_id = ?;', warn_message, guild_id);
    updateRandomize = async (guild_id: string, randomize_url: boolean) => await this.db.run('UPDATE shuffleSettings SET randomize_url = ? WHERE guild_id = ?;', randomize_url, guild_id);

    deleteGuild = async(guild_id: string) => 
        await this.db.run(`
            DELETE FROM shuffleSettings WHERE guild_id = :guildid;
        `, { ':guildid': guild_id });
}