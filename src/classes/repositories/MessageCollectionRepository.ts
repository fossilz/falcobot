import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
import DbRepository from './DbRepository';
import MessageCollectionModel from '../dataModels/MessageCollectionModel';
import MessageCollectionItemModel from '../dataModels/MessageCollectionItemModel';

export default class MessageCollectionRepository extends DbRepository {
    
    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        super(db);
        this.readyOn(this.initAsync);
    }

    private initAsync = async () => {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS messageCollections (
                guild_id TEXT NOT NULL,
                messageCollectionId INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                emoji TEXT,
                role TEXT,
                multiReact INTEGER NOT NULL DEFAULT 0,
                lastUpdatedUtc TEXT NOT NULL,
                lastPublishedUtc TEXT,
                requiresPublish INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS messageCollectionItems (
                guild_id TEXT NOT NULL,
                messageCollectionId INTEGER NOT NULL,
                messageCollectionItemId INTEGER PRIMARY KEY AUTOINCREMENT,
                sortIndex INTEGER NOT NULL,
                allowReact INTEGER NOT NULL DEFAULT 1,
                content TEXT NOT NULL,
                publishedMessageId TEXT,
                maintainLast INTEGER NOT NULL DEFAULT 0,
                lastUpdatedUtc TEXT NOT NULL,
                pendingDelete INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS messageCollectionItemUsers (
                guild_id TEXT NOT NULL,
                messageCollectionId INTEGER NOT NULL,
                messageCollectionItemId INTEGER NOT NULL,
                userId TEXT NOT NULL,
                PRIMARY KEY(guild_id, messageCollectionId, messageCollectionItemId, userId)
            );
        `);
    }

    insert = async (messageCollection: MessageCollectionModel) : Promise<number|undefined> => {
        const result = await this.db.run(
            'INSERT OR IGNORE INTO messageCollections (guild_id, channel, emoji, role, multiReact, lastUpdatedUtc, lastPublishedUtc, requiresPublish) VALUES (?, ?, ?, ?, ?, ?, ?, ?);', 
            messageCollection.guild_id, 
            messageCollection.channel,
            messageCollection.emoji,
            messageCollection.role,
            messageCollection.multiReact,
            messageCollection.lastUpdatedUtc,
            messageCollection.lastPublishedUtc,
            messageCollection.requiresPublish
        );
        return result.lastID;
    };
    insertItem = async (messageCollectionItem: MessageCollectionItemModel) : Promise<void> => {
        await this.sortUp(messageCollectionItem.guild_id, messageCollectionItem.messageCollectionId, messageCollectionItem.sortIndex);
        await this.db.run(
            'INSERT OR IGNORE INTO messageCollectionItems (guild_id, messageCollectionId, sortIndex, allowReact, content, maintainLast, lastUpdatedUtc, pendingDelete) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            messageCollectionItem.guild_id,
            messageCollectionItem.messageCollectionId,
            messageCollectionItem.sortIndex,
            messageCollectionItem.allowReact,
            messageCollectionItem.content,
            messageCollectionItem.maintainLast,
            messageCollectionItem.lastUpdatedUtc
        );
        await this.setUpdated(messageCollectionItem.guild_id, messageCollectionItem.messageCollectionId, messageCollectionItem.lastUpdatedUtc);
    }
    insertReaction = async(guild_id: string, messageCollectionId: number, messageCollectionItemId: number, userId: string) => {
        await this.db.run(
            'INSERT OR REPLACE INTO messageCollectionItemUsers (guild_id, messageCollectionId, messageCollectionItemId, userId) VALUES (?, ?, ?, ?)',
            guild_id,
            messageCollectionId,
            messageCollectionItemId,
            userId
        );
    }

    select = async (guild_id: string, messageCollectionId: number) => {
        return await this.db.get<MessageCollectionModel>('SELECT * FROM messageCollections WHERE guild_id= ? AND messageCollectionId = ?', guild_id, messageCollectionId);
    }
    selectAll = async (guild_id: string) => {
        return await this.db.all<MessageCollectionModel[]>('SELECT * FROM messageCollections WHERE guild_id= ?', guild_id);
    }
    selectItem = async (guild_id: string, messageCollectionId: number, messageCollectionItemId: number) => {
        return await this.db.get<MessageCollectionItemModel>('SELECT * FROM messageCollectionItems WHERE guild_id= ? AND messageCollectionId = ? AND messageCollectionItemId = ?', guild_id, messageCollectionId, messageCollectionItemId);
    }
    selectItems = async (guild_id: string, messageCollectionId: number) => {
        return await this.db.all<MessageCollectionItemModel[]>('SELECT * FROM messageCollectionItems WHERE guild_id= ? AND messageCollectionId = ?', guild_id, messageCollectionId);
    }
    selectAllItems = async (guild_id: string) => {
        return await this.db.all<MessageCollectionItemModel[]>('SELECT * FROM messageCollectionItems WHERE guild_id= ?', guild_id);
    }
    selectReaction = async (guild_id: string, messageCollectionId: number, messageCollectionItemId: number, userId: string) => {
        return await this.db.get<MessageCollectionItemModel>('SELECT * FROM messageCollectionItemUsers WHERE guild_id= ? AND messageCollectionId = ? AND messageCollectionItemId = ? AND userId = ?', guild_id, messageCollectionId, messageCollectionItemId, userId);
    }
    hasUnreactedItems = async (guild_id: string, messageCollectionId: number, userId: string) : Promise<boolean> => {
        const result = await this.db.get<{unworkedCount:number}>(`
SELECT COUNT(*) AS [unworkedCount] 
FROM messageCollectionItems AS mci
WHERE mci.guild_id = ? and mci.messageCollectionId = ? AND mci.allowReact = 1 AND mci.pendingDelete = 0
  AND NOT EXISTS(
      SELECT 1 
      FROM messageCollectionItemUsers AS mciu
      WHERE mciu.guild_id = mci.guild_id AND mciu.messageCollectionId = mci.messageCollectionId AND mciu.messageCollectionItemId = mci.messageCollectionItemId AND mciu.userId = ?
  )`, guild_id, messageCollectionId, userId);
        return (result?.unworkedCount || 0) > 0;
    }

    sortUp = async (guild_id: string, messageCollectionId: number, afterIndex: number) => {
        await this.db.run('UPDATE messageCollectionItems SET sortIndex = sortIndex + 1 WHERE guild_id= ? AND messageCollectionId = ? AND sortIndex >= ?', guild_id, messageCollectionId, afterIndex);
    }
    sortDown = async (guild_id: string, messageCollectionId: number, afterIndex: number) => {
        await this.db.run('UPDATE messageCollectionItems SET sortIndex = sortIndex - 1 WHERE guild_id= ? AND messageCollectionId = ? AND sortIndex >= ?', guild_id, messageCollectionId, afterIndex);
    }
    setNeedsPublish = async (guild_id: string, messageCollectionId: number) => {
        await this.db.run('UPDATE messageCollections SET requiresPublish = 1 WHERE guild_id= ? AND messageCollectionId = ?', guild_id, messageCollectionId);
    }
    setUpdated = async (guild_id: string, messageCollectionId: number, lastUpdatedUtc: string) => {
        await this.db.run('UPDATE messageCollections SET lastUpdatedUtc = ?, requiresPublish = 1 WHERE guild_id= ? AND messageCollectionId = ?', lastUpdatedUtc, guild_id, messageCollectionId);
    }
    setPublished = async (guild_id: string, messageCollectionId: number, lastPublishedUtc: string) => {
        await this.db.run('UPDATE messageCollections SET lastPublishedUtc = ?, requiresPublish = 0 WHERE guild_id= ? AND messageCollectionId = ?', lastPublishedUtc, guild_id, messageCollectionId);
    }
    update = async (messageCollection: MessageCollectionModel) => {
        await this.db.run(
            'UPDATE messageCollections SET emoji = ?, role = ?, multiReact = ?, lastUpdatedUtc = ?, requiresPublish = 1 WHERE guild_id= ? AND messageCollectionId = ?',
            messageCollection.emoji,
            messageCollection.role,
            messageCollection.multiReact,
            messageCollection.lastUpdatedUtc,
            messageCollection.guild_id,
            messageCollection.messageCollectionId
        );
    }
    updateItem = async (messageCollectionItem: MessageCollectionItemModel) => {
        await this.db.run(
            'UPDATE messageCollectionItems SET allowReact = ?, maintainLast = ?, content = ?, lastUpdatedUtc = ? WHERE guild_id= ? AND messageCollectionId = ? AND messageCollectionItemId = ?',
            messageCollectionItem.allowReact,
            messageCollectionItem.maintainLast,
            messageCollectionItem.content,
            messageCollectionItem.lastUpdatedUtc,
            messageCollectionItem.guild_id,
            messageCollectionItem.messageCollectionId,
            messageCollectionItem.messageCollectionItemId
        );
        await this.setUpdated(messageCollectionItem.guild_id, messageCollectionItem.messageCollectionId, messageCollectionItem.lastUpdatedUtc);
    }
    publishMessageItem = async (guild_id: string, messageCollectionId: number, messageCollectionItemId: number, publishedMessageId: string|null) => {
        await this.db.run(
            'UPDATE messageCollectionItems SET publishedMessageId = ? WHERE guild_id= ? AND messageCollectionId = ? AND messageCollectionItemId = ?',
            publishedMessageId,
            guild_id,
            messageCollectionId,
            messageCollectionItemId
        );
    }

    softDeleteMessageItem = async (guild_id: string, messageCollectionId: number, messageCollectionItemId: number) => {
        await this.db.run(
            'UPDATE messageCollectionItems SET pendingDelete = 1 WHERE guild_id= ? AND messageCollectionId = ? AND messageCollectionItemId = ?',
            guild_id,
            messageCollectionId,
            messageCollectionItemId
        );
        await this.setNeedsPublish(guild_id, messageCollectionId);
    }
    deleteReactionsForUser = async (guild_id: string, messageCollectionId: number, userId: string) => {
        await this.db.run('DELETE FROM messageCollectionItemUsers WHERE guild_id= ? AND messageCollectionId = ? AND userId = ?', guild_id, messageCollectionId, userId);
    }
    deleteMessageItem = async (guild_id: string, messageCollectionId: number, messageCollectionItemId: number) => {
        await this.db.run('DELETE FROM messageCollectionItemUsers WHERE guild_id= ? AND messageCollectionId = ? AND messageCollectionItemId = ?', guild_id, messageCollectionId, messageCollectionItemId);
        const deletedMessageItem = await this.selectItem(guild_id, messageCollectionId, messageCollectionItemId);
        if (deletedMessageItem === undefined) return;
        await this.db.run('DELETE FROM messageCollectionItems WHERE guild_id= ? AND messageCollectionId = ? AND messageCollectionItemId = ?', guild_id, messageCollectionId, messageCollectionItemId);
        await this.sortDown(guild_id, messageCollectionId, deletedMessageItem.sortIndex);
    }
    delete = async (guild_id: string, messageCollectionId: number) => {
        await this.db.run('DELETE FROM messageCollectionItemUsers WHERE guild_id= ? AND messageCollectionId = ?', guild_id, messageCollectionId);
        await this.db.run('DELETE FROM messageCollectionItems WHERE guild_id= ? AND messageCollectionId = ?', guild_id, messageCollectionId);
        await this.db.run('DELETE FROM messageCollections WHERE guild_id= ? AND messageCollectionId = ?', guild_id, messageCollectionId);
    }
    deleteGuild = async (guild_id: string) => {
        await this.db.run('DELETE FROM messageCollectionItemUsers WHERE guild_id= ?', guild_id);
        await this.db.run('DELETE FROM messageCollectionItems WHERE guild_id= ?', guild_id);
        await this.db.run('DELETE FROM messageCollections WHERE guild_id= ?', guild_id);
    }
}
