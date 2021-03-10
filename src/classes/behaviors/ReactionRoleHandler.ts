import { CollectorFilter, Guild, Message, MessageReaction, ReactionCollector, ReactionCollectorOptions, TextChannel, User } from "discord.js";
import { MemberReactionRoleModel, MemberReactionRoleQueueItemState } from "../dataModels/MemberReactionRoleModel";
import ReactionRoleModel from "../dataModels/ReactionRoleModel";
import Repository from "../Repository";
import RepositoryFactory from "../RepositoryFactory";
import { asyncForEach } from "../utils/functions";
import { MemberRoleHelper } from "./MemberRoleHelper";
import { PermissionSetHandler, PermissionCheckResultType } from './PermissionSetHandler';

export class ReactionRoleHandler {
    private static guild_listeners: { [guild_id: string]: GuildRRListener } = {};

    public static SetupAllReactionRoleListenersForGuildAsync = async (guild: Guild) => {
        // Setup the guild listener object... this will store all active RR listeners / queue workers
        ReactionRoleHandler.guild_listeners[guild.id] = new GuildRRListener(guild.id);
        const repo = await RepositoryFactory.getInstanceAsync();
        const reactionRoles = await repo.ReactionRoles.selectAll(guild.id);
        await asyncForEach(reactionRoles, async (rr: ReactionRoleModel) => await ReactionRoleHandler.SetupReactionRoleListenerAsync(guild, rr, repo));
    }

    public static SetupReactionRoleListenerAsync = async (guild: Guild, rr: ReactionRoleModel, repo: Repository) => {
        // Before we start listening, validate all the IDs are correct
        const channel = guild.channels.cache.get(rr.channel_id);
        if (channel === undefined || !(channel instanceof TextChannel)) return;
        const tChannel = <TextChannel>channel;
        const role = guild.roles.cache.get(rr.role_id);
        if (role === undefined) return;
        const message = await tChannel.messages.fetch(rr.message_id);
        if (message === undefined || message === null || message.deleted) return;
        const emoji = rr.emoji;
        
        // Create a Listener object to hold the collector and queue worker
        const listener = new ReactionRoleListener(rr);
        // Initialize the reaction collector and the queue listener (but don't start yet)
        listener.initialize(guild, repo, message, emoji);
        // Add this listener to the guild listener object
        ReactionRoleHandler.AddReactionRoleListener(listener);
        // Start the queue worker
        listener.start();
    }

    public static AssignMemberReactionAsync = async (guild: Guild, rr: ReactionRoleModel, repo: Repository, user: User, reaction_state: boolean) => {
        const reactionRole = await repo.ReactionRoles.select(guild.id, rr.reactionrole_id);
        if (reactionRole === undefined) return;
        const member = guild.members.cache.get(user.id);
        if (member === undefined) return;
        // If a Permission Set is attached to this Reaction Role, deny reaction if the member is excluded (Roles contingent on other roles)
        var permissionCheck = await PermissionSetHandler.CheckPermissions(guild.id, reactionRole.permissionset_id, member);
        if (PermissionSetHandler.Has(permissionCheck, PermissionCheckResultType.FailRoleCheck) || PermissionSetHandler.Has(permissionCheck, PermissionCheckResultType.FailMemberCheck)) {
            return;
        }
        // Add the member reaction role to the queue table
        await repo.MemberReactionRoles.enqueue(guild.id, user.id, rr.reactionrole_id, reaction_state);
        // If the queue worker is in a "waiting" state, reset it to 0 and process items
        ReactionRoleHandler.ResetQueueDelay(guild.id, rr.reactionrole_id);
    }

    public static ProcessMemberReactionRoleAsync = async (guild: Guild, reactionrole_id: number, user_id: string, last_reaction_state: boolean, reaction_changes: number) => {
        const rrListener = ReactionRoleHandler.guild_listeners[guild.id]?.get(reactionrole_id);
        if (rrListener === undefined) return;
        const member = guild.members.cache.get(user_id);
        if (member === undefined) return;
        const role = guild.roles.cache.get(rrListener.role_id);
        if (role === undefined) return;

        // Future considerations - log if the user toggled their reaction role multiple times
        if (reaction_changes > 3){
            console.log('Excessive reaction changes:', member, role, reaction_changes);
        }
        // This is purely for debugging purposes for now
        console.log(last_reaction_state ? 'Assigning role' : 'Removing role', role.id, 'from', member.id);
        
        // Use the last state of the person's react/unreact
        if (last_reaction_state) {
            // Consider this a success if they already have the role
            if (member.roles.cache.has(role.id)) return true;
            // Try to assign the role, returning false if this failed
            return await MemberRoleHelper.TryAssignRole(member, role);
        } else {
            // Consider this a success if they already don't have the role
            if (!member.roles.cache.has(role.id)) return true;
            // Try to remove the role, returning false if this failed
            return await MemberRoleHelper.TryRemoveRole(member, role);
        }
    }

    // Used to reset the queue "waiting" timeout to start immediately processing reactions
    public static ResetQueueDelay = (guild_id: string, reactionrole_id: number) => {
        const gl = ReactionRoleHandler.guild_listeners[guild_id];
        if (gl === undefined) return;
        gl.get(reactionrole_id)?.queueWorker?.reset();
    }

    // Used when a reaction role is removed, stop listening and working queue items
    public static StopListening = (guild_id: string, reactionrole_id: number) => {
        const gl = ReactionRoleHandler.guild_listeners[guild_id];
        if (gl === undefined) return;
        const listener = gl.remove(reactionrole_id);
        if (listener === undefined) return;
        listener.collector.stop();
        listener.queueWorker?.stop();
    }

    private static AddReactionRoleListener = (rrListener: ReactionRoleListener) => {
        ReactionRoleHandler.guild_listeners[rrListener.guild_id].add(rrListener);
    }
}

class ReactionRoleListener {
    private _reactionRole: ReactionRoleModel;

    public guild_id: string;
    public reactionrole_id: number;
    public message_id: string;
    public role_id: string;
    public channel_id: string;

    public collector: ReactionCollector;
    public queueWorker: ReactionRoleQueueWorker;

    constructor( rr: ReactionRoleModel) {
        this._reactionRole = rr;
        
        this.guild_id = rr.guild_id;
        this.reactionrole_id = rr.reactionrole_id;
        this.message_id = rr.message_id;
        this.role_id = rr.role_id;
        this.channel_id = rr.channel_id;
    }

    public initialize = (guild: Guild, repo: Repository, message: Message, emoji: string) => {
        // This particular collector only needs to collect one specific emoji
        const collectionFilter: CollectorFilter = (reaction: MessageReaction, user: User) => {
            if (user.bot) return false;
            return reaction.emoji.id === emoji || reaction.emoji.name === emoji;
        }
        // This option is required in order for us to receive the 'remove' event
        const collectorOptions: ReactionCollectorOptions = {
            dispose: true
        }
        // Setup a reaction collector on the message attached to this ReactionRole
        const reactionCollector = message.createReactionCollector(collectionFilter, collectorOptions);
        // Event handler for someone reacting
        reactionCollector.on('collect', async (_: MessageReaction, user: User) => {
            await ReactionRoleHandler.AssignMemberReactionAsync(guild, this._reactionRole, repo, user, true);
        });
        // Event handler for someone unreacting
        // Please note - this will only capture unreactions for reactions that occurred while bot was running
        reactionCollector.on('remove', async (_: MessageReaction, user: User) => {
            await ReactionRoleHandler.AssignMemberReactionAsync(guild, this._reactionRole, repo, user, false);
        });
        this.collector = reactionCollector;
        this.queueWorker = new ReactionRoleQueueWorker(guild, this.reactionrole_id, repo);
    }

    public start = () => {
        // setImmediate puts this on the bottom of the js execution stack (below I/O and async/await resolution)
        // so this should be lower priority than processing realtime commands
        setImmediate(this.queueWorker.processQueue);
    }
}

// This is merely a collection class to hold all the listeners for a given guild
class GuildRRListener {
    public guild_id: string;
    public reactionrole_listeners: { [reactionrole_id: number]: ReactionRoleListener } = {};

    constructor(guild_id: string) {
        this.guild_id = guild_id;
    }

    add = (rr: ReactionRoleListener) => {
        this.reactionrole_listeners[rr.reactionrole_id] = rr;
    }

    get = (reactionrole_id: number) : ReactionRoleListener | undefined => {
        return this.reactionrole_listeners[reactionrole_id];
    }

    remove = (reactionrole_id: number) : ReactionRoleListener | undefined => {
        const rrl = this.get(reactionrole_id);
        if (rrl === undefined) return;
        delete this.reactionrole_listeners[reactionrole_id];
        return rrl;
    }
}

class ReactionRoleQueueWorker {
    public guild: Guild;
    public reactionrole_id: number;
    private repo: Repository;
    private abort: boolean = false;
    private waitDelay: number;
    private queueDelay: NodeJS.Timeout | undefined;

    private queueStarted: boolean = false;

    constructor(guild: Guild, reactionrole_id: number, repo: Repository) {
        this.guild = guild;
        this.reactionrole_id = reactionrole_id;
        this.repo = repo;
        this.waitDelay = 0;
    }

    processQueue = async () => {

        if (!this.queueStarted) {
            this.queueStarted = true;
            console.log('Processing queue:', this.guild.id, this.reactionrole_id);
        }

        // This is how we stop the vicious cycle
        if (this.abort) return;
        // in case this was triggered from a setTimeout below, clear the timeout reference
        this.queueDelay = undefined;
        // Get the next item from this queue, if one exists
        const nextItem = await this.repo.MemberReactionRoles.dequeue(this.guild.id, this.reactionrole_id);
        // If there's no item, wait and check again
        if (nextItem === undefined) {
            // Increasing delay each time this comes back empty, so we aren't hammering the db
            if (this.waitDelay < 60000) {
                this.waitDelay += 1000;
            }
            // Wait X seconds and try to process again
            // setTimeout puts this on the bottom of the js execution stack (below I/O and async/await resolution)
            // so this should be lower priority than processing realtime commands
            this.queueDelay = setTimeout(this.processQueue, this.waitDelay);
            return;
        }
        // We're processing an item, so reset the waitDelay to 0 for the next "empty" loop
        this.waitDelay = 0;
        // Process this queue item.  Setimmediate should push this to a lower priority than other realtime commands
        setImmediate(async () => await this.processQueueItem(nextItem));
        // Since we've just processed an item, loop around to process the next item "immediately"
        // setImmediate puts this on the bottom of the js execution stack (below I/O and async/await resolution)
        // so this should be lower priority than processing realtime commands
        setImmediate(this.processQueue);
    }

    // Refactor this to have a retry
    processQueueItem = async (item: MemberReactionRoleModel) => {
        // Pass in the queue item state to process the react/unreact as appropriate, get back a "success" state to determine how to resolve the queue item
        const success = await ReactionRoleHandler.ProcessMemberReactionRoleAsync(this.guild, this.reactionrole_id, item.user_id, item.last_reaction_state, item.reaction_changes);
        if (success) {
            // Delete the queue item - it's been processed successfully
            await this.repo.MemberReactionRoles.delete(item.guild_id, item.user_id, item.reactionrole_id, item.queue_worker_id);
        } else {
            // Refactor for recursive retry loop
            if (item.process_attempts < 3) {
                await this.repo.MemberReactionRoles.updateQueueItemState(item.guild_id, item.user_id, item.reactionrole_id, item.queue_worker_id, MemberReactionRoleQueueItemState.Failed_Retry, item.process_attempts + 1);
            } else {
                await this.repo.MemberReactionRoles.updateQueueItemState(item.guild_id, item.user_id, item.reactionrole_id, item.queue_worker_id, MemberReactionRoleQueueItemState.Failed_Abort, item.process_attempts + 1);
            }
        }
    }

    // If this is current waiting for a setTimeout to attempt the next queue loop,
    // reset back to 0 and process immediately
    reset = () => {
        if (this.queueDelay) {
            clearTimeout(this.queueDelay);
            this.queueDelay = undefined;
        }
        // setImmediate puts this on the bottom of the js execution stack (below I/O and async/await resolution)
        // so this should be lower priority than processing realtime commands
        setImmediate(this.processQueue);
    }

    // Stop processing this queue worker
    stop = () => {
        this.abort = true;
    }
}