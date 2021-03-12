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
                aliases TEXT,
                PRIMARY KEY(guild_id, command)
            );
        `);
    }

    insert = async (command: CommandModel) => await this.db.run(
        'INSERT OR IGNORE INTO commands (guild_id, command, reserved, logUsage, aliases) VALUES (?, ?, ?, ?, ?);', 
        command.guild_id, 
        command.command,
        command.reserved,
        command.logUsage,
        JSON.stringify(command.aliases)
    );

    select = async(guild_id: string, command: string) => {
        const dModel = await this.db.get<CommandDataModel>('SELECT * FROM commands WHERE guild_id = ? AND command = ?;', guild_id, command);
        if (dModel === undefined) return;
        return CommandDataModel.GetModel(dModel);
    };
    selectAll = async(guild_id: string) => {
        const dModels = await this.db.all<CommandDataModel[]>('SELECT * FROM commands WHERE guild_id = ?;', guild_id);
        return dModels.map(x => CommandDataModel.GetModel(x));
    }

    updateEnabled = async(guild_id: string, command: string, enabled: boolean) => await this.db.run('UPDATE commands SET enabled = ? WHERE guild_id = ? AND command = ?;', enabled, guild_id, command);
    updateLogUsage = async(guild_id: string, command: string, logUsage: boolean) => await this.db.run('UPDATE commands SET logUsage = ? WHERE guild_id = ? AND command = ?;', logUsage, guild_id, command);
    updatePermissionSet = async(guild_id: string, command: string, permissionset_id: number|null) => await this.db.run('UPDATE commands SET permissionset_id = ? WHERE guild_id = ? AND command = ?;', permissionset_id, guild_id, command);
    updateLogAttempts = async(guild_id: string, command: string, logAttempts: boolean) => await this.db.run('UPDATE commands SET logAttempts = ? WHERE guild_id = ? AND command = ?;', logAttempts, guild_id, command);
    updateFallbackCommand = async(guild_id: string, command: string, fallbackCommand: string|null) => await this.db.run('UPDATE commands SET fallbackCommand = ? WHERE guild_id = ? AND command = ?;', fallbackCommand, guild_id, command);
    updateOutputChannelId = async(guild_id: string, command: string, outputChannelId: string|null) => await this.db.run('UPDATE commands SET outputChannelId = ? WHERE guild_id = ? AND command = ?;', outputChannelId, guild_id, command);
    updateSuppressCommand = async(guild_id: string, command: string, suppressCommand: boolean) => await this.db.run('UPDATE commands SET suppressCommand = ? WHERE guild_id = ? AND command = ?;', suppressCommand, guild_id, command);
    updateAliases = async(guild_id: string, command: string, aliases: string[]) => await this.db.run('UPDATE commands SET aliases = ? WHERE guild_id = ? AND command = ?;', JSON.stringify(aliases), guild_id, command);

    delete = async(guild_id: string, command: string) => await this.db.run('DELETE FROM commands WHERE guild_id = ? AND command = ? AND reserved = 0;', guild_id, command);
    deleteGuild = async(guild_id: string) => await this.db.run('DELETE FROM commands WHERE guild_id = ?;', guild_id);
}

class CommandDataModel {
    public guild_id: string;
    public command: string;
    public reserved: boolean;
    public enabled: boolean;
    public logUsage: boolean;
    public permissionset_id: number|null;
    public logAttempts: boolean;
    public fallbackCommand: string|null;
    public outputChannelId: string|null;
    public suppressCommand: boolean;
    public aliases: string;

    public static GetModel = (dm: CommandDataModel) : CommandModel => {
        const m = new CommandModel(dm.guild_id);
        m.command = dm.command;
        m.reserved = dm.reserved;
        m.enabled = dm.enabled;
        m.logUsage = dm.logUsage;
        m.permissionset_id = dm.permissionset_id;
        m.logAttempts = dm.logAttempts;
        m.fallbackCommand = dm.fallbackCommand;
        m.outputChannelId = dm.outputChannelId;
        m.suppressCommand = dm.suppressCommand;
        m.aliases = JSON.parse(dm.aliases) || [];
        return m;
    }
}

export default CommandRepository;