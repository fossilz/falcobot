import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';

abstract class DbRepository {
    protected db: Database<sqlite3.Database, sqlite3.Statement>;
    public Ready: Promise<void>;

    constructor(db: Database<sqlite3.Database, sqlite3.Statement>){
        this.db = db;
        this.Ready = Promise.resolve();
    }

    protected readyOn(initFunc: () => Promise<void>) {
        this.Ready = new Promise((resolve, reject) => {
            initFunc().then(resolve).catch(reject);
        });
    }
}

export default DbRepository;