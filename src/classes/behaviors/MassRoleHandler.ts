import { Guild } from "discord.js";
import { RoleMemberCommand } from "../commands/admin/role";
import MassRoleMemberModel from "../dataModels/MassRoleMemberModel";
import MassRoleModel from "../dataModels/MassRoleModel";
import Repository from "../Repository";
import RepositoryFactory from "../RepositoryFactory";
import { asyncForEach } from "../utils/functions";

export class MassRoleHandler {
    private static guild_workers: { [guild_id: string]: GuildMassRoleWorkerCollection } = {};

    public static SetupAllMassRoleWorkersForGuildAsync = async (guild: Guild) => {
        MassRoleHandler.guild_workers[guild.id] = new GuildMassRoleWorkerCollection(guild.id);
        const repo = await RepositoryFactory.getInstanceAsync();
        const massRoles = await repo.MassRoles.selectAll(guild.id);
        await asyncForEach(massRoles, async (mr: MassRoleModel) => await MassRoleHandler.SetupMassRoleWorkerAsync(guild, mr, repo));
    }

    public static SetupMassRoleWorkerAsync = async (guild: Guild, mr: MassRoleModel, repo: Repository) => {
        const queueWorker = new MassRoleQueueWorker(guild, mr, repo);
        MassRoleHandler.guild_workers[guild.id].add(queueWorker);
        setImmediate(queueWorker.processQueue);
    }

    public static StopWorking = (guild_id: string, massrole_id: number) => {
        const gl = MassRoleHandler.guild_workers[guild_id];
        if (gl === undefined) return;
        const queueWorker = gl.remove(massrole_id);
        if (queueWorker === undefined) return;
        queueWorker.stop();
    }
}

class GuildMassRoleWorkerCollection {
    public guild_id: string;
    public massrole_workers: { [massrole_id: number]: MassRoleQueueWorker } = {};

    constructor(guild_id: string) {
        this.guild_id = guild_id;
    }

    add = (qw: MassRoleQueueWorker) => {
        qw.onStop = () => this.remove(qw.massrole_id);
        this.massrole_workers[qw.massrole_id] = qw;
    }

    get = (massrole_id: number) : MassRoleQueueWorker | undefined => {
        return this.massrole_workers[massrole_id];
    }

    remove = (massrole_id: number) : MassRoleQueueWorker | undefined => {
        const qw = this.get(massrole_id);
        if (qw === undefined) return;
        delete this.massrole_workers[massrole_id];
        return qw;
    }
}

class MassRoleQueueWorker {
    public guild: Guild;
    public massrole_id: number;

    public onStop: () => {}|undefined;

    private repo: Repository;
    private abort: boolean = false;
    private queueStarted: boolean = false;
    private massRoleModel: MassRoleModel;

    constructor(guild: Guild, massRoleModel: MassRoleModel, repo: Repository) {
        this.guild = guild;
        this.massRoleModel = massRoleModel;
        this.massrole_id = massRoleModel.massrole_id;
        this.repo = repo;
    }

    processQueue = async () => {
        if (!this.queueStarted) {
            this.queueStarted = true;
        }
        
        if (this.abort) return;
        const nextItem = await this.repo.MassRoles.dequeueMember(this.guild.id, this.massrole_id);
        if (nextItem === undefined) {
            // Since this doesn't have the fill-over-time mechanics of reaction role, this should trigger the delete
            await this.repo.MassRoles.delete(this.guild.id, this.massrole_id);
            this.stop();
            return;
        }
        setImmediate(async () => await this.processQueueItem(nextItem));
        setImmediate(this.processQueue);
    }

    processQueueItem = async (item: MassRoleMemberModel) => {
        const mr = this.massRoleModel;
        await RoleMemberCommand.TryApplyRoleAssignmentsAsync(this.guild, mr.user_id, item.user_id, mr.addRoleIds, mr.removeRoleIds, mr.toggleRoleIds);
    }

    stop = () => {
        this.abort = true;
        if (this.onStop) this.onStop();
    }
}