import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { SQLITE_FILENAME } from "../config";
import DbRepository from './repositories/DbRepository';
import GuildRepository from './repositories/GuildRepository';
import RoleRepository from './repositories/RoleRepository';

class Repository {
    private db: Database<sqlite3.Database, sqlite3.Statement>;

    public Guilds: GuildRepository;
    public Roles: RoleRepository;

    async initAsync(){
        this.db = await open({
            filename: SQLITE_FILENAME,
            driver: sqlite3.Database
        });

        this.Guilds = await this.initializeRepoAsync(GuildRepository);
        this.Roles = await this.initializeRepoAsync(RoleRepository);
    }

    private async initializeRepoAsync<T extends DbRepository>(c: { new(db: Database<sqlite3.Database, sqlite3.Statement>): T }): Promise<T> {
        const repo = new c(this.db);
        await repo.Ready;
        return repo;
    }
}
export default Repository;