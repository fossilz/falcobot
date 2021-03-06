import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { SQLITE_FILENAME } from "../config";
import DbRepository from './repositories/DbRepository';
import GuildRepository from './repositories/GuildRepository';
import RoleRepository from './repositories/RoleRepository';
import ChannelRepository from './repositories/ChannelRepository';
import PermissionSetRepository from './repositories/PermissionSetRepository';
import CommandRepository from './repositories/CommandRepository';
import MemberRepository from './repositories/MemberRepository';
import MemberNoteRepository from './repositories/MemberNoteRepository';

class Repository {
    private db: Database<sqlite3.Database, sqlite3.Statement>;

    public Guilds: GuildRepository;
    public Roles: RoleRepository;
    public Channels: ChannelRepository;
    public PermissionSets: PermissionSetRepository;
    public Commands: CommandRepository;
    public Members: MemberRepository;
    public MemberNotes: MemberNoteRepository;

    async initAsync(){
        this.db = await open({
            filename: SQLITE_FILENAME,
            driver: sqlite3.Database
        });

        this.Guilds = await this.initializeRepoAsync(GuildRepository);
        this.Roles = await this.initializeRepoAsync(RoleRepository);
        this.Channels = await this.initializeRepoAsync(ChannelRepository);
        this.PermissionSets = await this.initializeRepoAsync(PermissionSetRepository);
        this.Commands = await this.initializeRepoAsync(CommandRepository);
        this.Members = await this.initializeRepoAsync(MemberRepository);
        this.MemberNotes = await this.initializeRepoAsync(MemberNoteRepository);
    }

    private async initializeRepoAsync<T extends DbRepository>(c: { new(db: Database<sqlite3.Database, sqlite3.Statement>): T }): Promise<T> {
        const repo = new c(this.db);
        await repo.Ready;
        return repo;
    }
}
export default Repository;