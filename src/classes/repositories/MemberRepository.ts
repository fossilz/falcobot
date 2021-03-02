import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import MemberModel from '../dataModels/MemberModel';
import DbRepository from './DbRepository';

class MemberRepository extends DbRepository {

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS members (
                guild_id TEXT,
                user_id TEXT NOT NULL,
                user_name string NOT NULL,
                user_discriminator string,
                bot INTEGER DEFAULT 0 NOT NULL,
                joinedTimestamp INTEGER,
                nickname TEXT,
                deleted INTEGER DEFAULT 0 NOT NULL,
                PRIMARY KEY(guild_id, user_id)
            );
        `);
    }

    insert = async (member: MemberModel) => await this.db.run(`
        INSERT INTO members (guild_id, user_id, user_name, user_discriminator, bot, joinedTimestamp, nickname)
        VALUES (:guildid, :userid, :username, :userdiscriminator, :bot, :joinedtimestamp, :nickname)
        ON CONFLICT(guild_id,user_id) DO UPDATE SET user_name = :username, user_discriminator = :userdiscriminator, deleted = 0, joinedTimestamp = :joinedtimestamp, nickname = :nickname;
    `, { 
        ':guildid': member.guild_id, 
        ':userid': member.user_id, 
        ':username': member.user_name, 
        ':userdiscriminator': member.user_discriminator, 
        ':bot': member.bot,
        ':joinedtimestamp': member.joinedTimestamp,
        ':nickname': member.nickname
    });

    select = async(guild_id: string, user_id: string) => await this.db.get<MemberModel>('SELECT * FROM members WHERE guild_id = ? AND user_id = ?;', guild_id, user_id);
    selectUsername = async(guild_id: string, user_name: string) => await this.db.all<MemberModel[]>('SELECT * FROM members WHERE guild_id = ? AND user_name = ?;', guild_id, '%' + user_name + '%');
    selectAll = async(guild_id: string) => await this.db.all<MemberModel[]>('SELECT * FROM members WHERE guild_id = ?;', guild_id);

    updateUserName = async(guild_id: string, user_id: string, user_name: string, user_discriminator: string) => await this.db.run('UPDATE members SET user_name = ?, user_discriminator = ? WHERE guild_id = ? AND user_id = ?;', user_name, user_discriminator, guild_id, user_id);
    updateNickname = async(guild_id: string, user_id: string, nickname: string) => await this.db.run('UPDATE members SET nickname = ? WHERE guild_id = ? AND user_id = ?;', nickname, guild_id, user_id);
    updateDeleted = async(guild_id: string, user_id: string, deleted: boolean) => await this.db.run('UPDATE members SET deleted = ? WHERE guild_id = ? AND user_id = ?;', deleted, guild_id, user_id);

    delete = async(guild_id: string, user_id: string) => await this.db.run('DELETE FROM members WHERE guild_id = ? AND user_id = ? AND reserved = 0;', guild_id, user_id);
    deleteGuild = async(guild_id: string) => await this.db.run('DELETE FROM members WHERE guild_id = ?;', guild_id);
}

export default MemberRepository;