import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import CommandModel from '../dataModels/CommandModel';
import DbRepository from './DbRepository';

class CommandRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS commands (
                guild_id TEXT,
                command TEXT NOT NULL,
                reserved INTEGER DEFAULT 0 NOT NULL,
                enabled INTEGER DEFAULT 1 NOT NULL,
                logUsage INTEGER DEFAULT 0 NOT NULL,
                permissionset_id INTEGER,
                logAttempts INTEGER DEFAULT 0 NOT NULL,
                fallbackCommand TEXT,
                outputChannelId TEXT,
                suppressCommand INTEGER DEFAULT 0 NOT NULL,
                PRIMARY KEY(guild_id, command)
            );
        `);
    }

    insert = async (command: CommandModel) => await this.db.run(
        'INSERT OR IGNORE INTO commands (guild_id, command, reserved, logUsage) VALUES (?, ?, ?, ?);', 
        command.guild_id, 
        command.command,
        command.reserved,
        command.logUsage
    );

    select = async(guild_id: string, command: string) => await this.db.get<CommandModel>('SELECT * FROM commands WHERE guild_id = ? AND command = ?;', guild_id, command);
    selectAll = async(guild_id: string) => await this.db.all<CommandModel[]>('SELECT * FROM commands WHERE guild_id = ?;', guild_id);

    updateEnabled = async(guild_id: string, command: string, enabled: boolean) => await this.db.run('UPDATE commands SET enabled = ? WHERE guild_id = ? AND command = ?;', enabled, guild_id, command);
    updateLogUsage = async(guild_id: string, command: string, logUsage: boolean) => await this.db.run('UPDATE commands SET logUsage = ? WHERE guild_id = ? AND command = ?;', logUsage, guild_id, command);
    updatePermissionSet = async(guild_id: string, command: string, permissionset_id: number|null) => await this.db.run('UPDATE commands SET permissionset_id = ? WHERE guild_id = ? AND command = ?;', permissionset_id, guild_id, command);
    updateLogAttempts = async(guild_id: string, command: string, logAttempts: boolean) => await this.db.run('UPDATE commands SET logAttempts = ? WHERE guild_id = ? AND command = ?;', logAttempts, guild_id, command);
    updateFallbackCommand = async(guild_id: string, command: string, fallbackCommand: string|null) => await this.db.run('UPDATE commands SET fallbackCommand = ? WHERE guild_id = ? AND command = ?;', fallbackCommand, guild_id, command);
    updateOutputChannelId = async(guild_id: string, command: string, outputChannelId: string|null) => await this.db.run('UPDATE commands SET outputChannelId = ? WHERE guild_id = ? AND command = ?;', outputChannelId, guild_id, command);
    updateSuppressCommand = async(guild_id: string, command: string, suppressCommand: boolean) => await this.db.run('UPDATE commands SET suppressCommand = ? WHERE guild_id = ? AND command = ?;', suppressCommand, guild_id, command);

    delete = async(guild_id: string, command: string) => await this.db.run('DELETE FROM commands WHERE guild_id = ? AND command = ? AND reserved = 0;', guild_id, command);
    deleteGuild = async(guild_id: string) => await this.db.run('DELETE FROM commands WHERE guild_id = ?;', guild_id);
}

export default CommandRepository;