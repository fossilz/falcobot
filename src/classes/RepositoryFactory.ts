import Repository from './Repository';

class RepositoryFactory {
    static instance: Repository;
    static semaphore = false;

    public static async getInstanceAsync() {
        if (!RepositoryFactory.instance && !RepositoryFactory.semaphore) {
            RepositoryFactory.semaphore = true;
            const instance = new Repository();
            RepositoryFactory.instance = instance;
            await instance.initAsync();
        }
        return RepositoryFactory.instance;
    }
}
export default RepositoryFactory;