import { Guild, GuildMember, Message, MessageEmbed, Role } from "discord.js";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberComparer, MemberComparisonResult } from "../../behaviors/MemberComparer";
import { MemberRoleHelper } from "../../behaviors/MemberRoleHelper";
import RepositoryFactory from "../../RepositoryFactory";
import MassRoleModel from "../../dataModels/MassRoleModel";
import MassRoleMemberModel from "../../dataModels/MassRoleMemberModel";
import { MassRoleHandler } from "../../behaviors/MassRoleHandler";

export class RoleCommand extends Command {
    public static readonly CommandName: string = 'role';

    constructor(){
        super({
            name: RoleCommand.CommandName,
            childCommands: [
                RoleMemberCommand.CommandName,
                RoleAllCommand.CommandName,
                RoleBotCommand.CommandName,
                RoleHumanCommand.CommandName,
                RoleInCommand.CommandName,
                RoleNotInCommand.CommandName,
                RoleStatusCommand.CommandName,
                RoleCancelCommand.CommandName
            ],
            category: 'admin',
            usage: 'role <user ID/mention> [+|-] <role ID/mention/name>',
            description: 'Assign roles',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role @flamgo Mute','role @fossilz -admin'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (message: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const firstArg = args.shift();
        const subCommandHandled = await this.firstArgHandled(firstArg, message, args, commandExec);
        if (subCommandHandled) return;
        // Command not handled, output help text...
        commandExec.sendAsync("STUB: insert role command help text here");
    }

    firstArgHandled = async(firstArg: string|undefined, message: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<boolean> => {
        if (firstArg === undefined) return false;

        switch(firstArg.toLowerCase()){
            case "all":{
                await this.runChildCommandAsync(RoleAllCommand.CommandName, message, args, commandExec);
                return true;
            }
            case "bot":{
                await this.runChildCommandAsync(RoleBotCommand.CommandName, message, args, commandExec);
                return true;
            }
            case "human":{
                await this.runChildCommandAsync(RoleHumanCommand.CommandName, message, args, commandExec);
                return true;
            }
            case "in":{
                await this.runChildCommandAsync(RoleInCommand.CommandName, message, args, commandExec);
                return true;
            }
            case "notin":{
                await this.runChildCommandAsync(RoleNotInCommand.CommandName, message, args, commandExec);
                return true;
            }
            case "status":{
                await this.runChildCommandAsync(RoleStatusCommand.CommandName, message, args, commandExec);
                return true;
            }
            case "cancel":{
                await this.runChildCommandAsync(RoleCancelCommand.CommandName, message, args, commandExec);
                return true;
            }
        }
        const target = Command.extractMemberMention(commandExec.guild, firstArg) || commandExec.guild.members.cache.get(firstArg);
        if (target !== undefined) {
            await this.runChildCommandAsync(RoleMemberCommand.CommandName, message, [target.id].concat(args), commandExec);
            return true;
        }

        return false;
    }
}

export class RoleMemberCommand extends Command {
    public static readonly CommandName: string = 'role.member';

    constructor(){
        super({
            name: RoleMemberCommand.CommandName,
            parentCommand: RoleCommand.CommandName,
            category: 'admin',
            usage: 'role <user ID/mention> [+|-] <role ID/mention/name>',
            description: 'Assign roles to a specific member',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role @flamgo Mute'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;
        if (commandExec.messageMember === null) return;
        const targetArg = args.shift();
        if (targetArg === undefined) {
            await commandExec.errorAsync('Cannot find target.');
            return;
        }
        const target = Command.extractMemberMention(guild, targetArg) || guild.members.cache.get(targetArg);
        var memberComparison = MemberComparer.CheckMemberComparison(commandExec.messageMember, target);
        if (memberComparison != MemberComparisonResult.ValidTarget) {
            await commandExec.errorAsync(MemberComparer.FormatErrorForVerb(memberComparison, 'assign roles to'));
            return;
        }
        if (target === undefined) return;

        const roleAssignments = new RoleAssignment(guild, commandExec.messageMember, args);
        if (!roleAssignments.hasRoles()){
            await commandExec.errorAsync('Could not parse appropriate roles');
        }
        await RoleMemberCommand.applyRoleAssignmentsAsync(target, roleAssignments);
    }

    /**
     * Compares the executor to the target and attempts to assign all appropriate roles
     * 
     * @param {Guild} guild The guild in which roles are being assigned
     * @param {string} user_id The ID of the user who initiated role assignment
     * @param {string} target_id The ID of the target user to whom roles are being assigned
     * @param {string} addRoleIds Comma-delimited list of roles to add to target
     * @param {string} removeRoleIds Comma-delimited list of roles to remove from target
     * @param {string} toggleRoleIds Comma-delimited list of roles to toggle on target
     */
    public static TryApplyRoleAssignmentsAsync = async (guild: Guild, user_id: string, target_id: string, addRoleIds: string|null, removeRoleIds: string|null, toggleRoleIds: string|null) => {
        const member = guild.members.cache.get(user_id);
        if (member === undefined) return;
        const target = guild.members.cache.get(target_id);
        var memberComparison = MemberComparer.CheckMemberComparison(member, target);
        if (target === undefined || memberComparison != MemberComparisonResult.ValidTarget) {
            return;
        }
        const roleAssignments = RoleAssignment.FromMassRoleModel(guild, member.id, addRoleIds, removeRoleIds, toggleRoleIds);
        if (roleAssignments === undefined || !roleAssignments.hasRoles()){
            return;
        }
        await RoleMemberCommand.applyRoleAssignmentsAsync(target, roleAssignments);
    }

    private static applyRoleAssignmentsAsync = async(target: GuildMember, roleAssignment: RoleAssignment) : Promise<void> => {
        let tasks: Promise<boolean>[] = [];
        if (roleAssignment.add != null) tasks = tasks.concat(roleAssignment.add.map(x => MemberRoleHelper.TryAssignRole(target, x)));
        if (roleAssignment.remove != null) tasks = tasks.concat(roleAssignment.remove.map(x => MemberRoleHelper.TryRemoveRole(target, x)));
        if (roleAssignment.toggle != null) tasks = tasks.concat(roleAssignment.toggle.map(x => MemberRoleHelper.TryToggleRole(target, x)));
        await Promise.all(tasks);
    }
}

export class RoleAllCommand extends Command {
    public static readonly CommandName: string = 'role.all';

    constructor(){
        super({
            name: RoleAllCommand.CommandName,
            parentCommand: RoleCommand.CommandName,
            category: 'admin',
            usage: 'role all [+|-] <role ID/mention/name>',
            description: 'Assign user roles to all users',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role all Member','role all -newb'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        await RoleAllCommand.SetupMassRoleAssignment(args, commandExec, true, true, null, null);
    }

    public static SetupMassRoleAssignment = async(args: string[], commandExec: CommandExecutionParameters, bots: boolean, humans: boolean, inRole: boolean|null, role: Role|null, memberFilter?: (member: GuildMember) => boolean) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const roleAssignments = new RoleAssignment(commandExec.guild, commandExec.messageMember, args);
        if (!roleAssignments.hasRoles()){
            await commandExec.errorAsync('Could not parse appropriate roles');
        }
        if (inRole !== null && role === null) return;
        const repo = await RepositoryFactory.getInstanceAsync();
        const massRole = new MassRoleModel();
        massRole.guild_id = commandExec.guild.id;
        massRole.user_id = commandExec.messageMember.id;
        massRole.bots = bots;
        massRole.humans = humans;
        massRole.inRole = inRole;
        massRole.role_id = role?.id || null;
        massRole.addRoleIds = roleAssignments.formatIds(roleAssignments.add);
        massRole.removeRoleIds = roleAssignments.formatIds(roleAssignments.remove);
        massRole.toggleRoleIds = roleAssignments.formatIds(roleAssignments.toggle);
        const massRoleId = await repo.MassRoles.insert(massRole);
        if (massRoleId === undefined) {
            await commandExec.errorAsync('Could not create mass role allocation');
            return;
        }
        massRole.massrole_id = massRoleId;
        const noFilter = function(_: GuildMember) { return true; };
        let memberCount: number = 0;
        const filter = memberFilter || noFilter;
        const mrmTasks = commandExec.guild.members.cache.filter(filter).map(x => {
            const mrmModel = new MassRoleMemberModel();
            mrmModel.guild_id = commandExec.guild.id;
            mrmModel.massrole_id = massRoleId;
            mrmModel.user_id = x.id;
            memberCount++;
            return repo.MassRoles.addUser(mrmModel);
        });
        await Promise.all(mrmTasks);
        await commandExec.sendAsync(`Mass role operation ${massRoleId} has been queued for ${memberCount} members.`);
        // Start the processor
        await MassRoleHandler.SetupMassRoleWorkerAsync(commandExec.guild, massRole, repo);
    }
}

export class RoleBotCommand extends Command {
    public static readonly CommandName: string = 'role.bot';

    constructor(){
        super({
            name: RoleBotCommand.CommandName,
            parentCommand: RoleCommand.CommandName,
            category: 'admin',
            usage: 'role bot [+|-] <role ID/mention/name>',
            description: 'Assign roles to all bots',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role bot +Bot'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        await RoleAllCommand.SetupMassRoleAssignment(args, commandExec, true, false, null, null, (x) => x.user.bot);
    }
}

export class RoleHumanCommand extends Command {
    public static readonly CommandName: string = 'role.human';

    constructor(){
        super({
            name: RoleHumanCommand.CommandName,
            parentCommand: RoleCommand.CommandName,
            category: 'admin',
            usage: 'role human [+|-] <role ID/mention/name>',
            description: 'Assign roles to all non-bot members',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role human +Member'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        await RoleAllCommand.SetupMassRoleAssignment(args, commandExec, false, true, null, null, (x) => !x.user.bot);
    }
}

export class RoleInCommand extends Command {
    public static readonly CommandName: string = 'role.in';

    constructor(){
        super({
            name: RoleInCommand.CommandName,
            parentCommand: RoleCommand.CommandName,
            category: 'admin',
            usage: 'role in <role ID/mention/name> [+|-] <role ID/mention/name>',
            description: 'Assign roles to all users with a given role',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role in @Member + Nameable'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;
        const roleArg = args.shift()?.toLowerCase();
        if (roleArg === undefined){
            await commandExec.errorAsync('Please specify role members should be in.');
            return;
        }
        const role = Command.extractRoleMention(guild, roleArg) || guild.roles.cache.get(roleArg) || guild.roles.cache.find(x => x.name.toLowerCase() == roleArg);
        if (role === undefined) {
            await commandExec.errorAsync('Invalid filter role');
            return;
        }
        await RoleAllCommand.SetupMassRoleAssignment(args, commandExec, true, true, true, role, x => x.roles.cache.has(role.id));
    }
}

export class RoleNotInCommand extends Command {
    public static readonly CommandName: string = 'role.notin';

    constructor(){
        super({
            name: RoleNotInCommand.CommandName,
            parentCommand: RoleCommand.CommandName,
            category: 'admin',
            usage: 'role notin <role ID/mention/name> [+|-] <role ID/mention/name>',
            description: 'Assign roles to all users without a given role',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role notin @newb + newb'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;
        const roleArg = args.shift()?.toLowerCase();
        if (roleArg === undefined){
            await commandExec.errorAsync('Please specify role members should not be in.');
            return;
        }
        const role = Command.extractRoleMention(guild, roleArg) || guild.roles.cache.get(roleArg) || guild.roles.cache.find(x => x.name.toLowerCase() == roleArg);
        if (role === undefined) {
            await commandExec.errorAsync('Invalid filter role');
            return;
        }
        await RoleAllCommand.SetupMassRoleAssignment(args, commandExec, true, true, false, role, x => !x.roles.cache.has(role.id));
    }
}

export class RoleStatusCommand extends Command {
    public static readonly CommandName: string = 'role.status';

    constructor(){
        super({
            name: RoleStatusCommand.CommandName,
            parentCommand: RoleCommand.CommandName,
            category: 'admin',
            usage: 'role status [mass role ID]',
            description: 'Checks status on a mass role assignment',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role status 5'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const statusArg = args.shift();
        if (statusArg === undefined) {
            // list pending mass role operations
            const massRoles = await repo.MassRoles.selectAll(commandExec.guild.id);
            if (massRoles.length === 0) {
                await commandExec.sendAsync('There are currently no pending mass role operations.');
                return;
            }
            const self = this;
            const embed = new MessageEmbed()
                .setTimestamp()
                .setColor(commandExec.me.displayHexColor);
            massRoles.forEach(mr => {
                embed.addField(`Mass Role Operation ${mr.massrole_id}`, self.formatMassRole(commandExec.guild, mr), false);
            });
            await commandExec.sendAsync(embed);

            return;
        }
        const massrole_id = parseInt(statusArg);
        if (isNaN(massrole_id)){
            await commandExec.errorAsync('Invalid mass role ID.');
            return;
        }
        const pendingCount = await repo.MassRoles.getPendingCount(commandExec.guild.id, massrole_id);
        if (pendingCount === undefined) {
            await commandExec.errorAsync('Invalid mass role ID.');
            return;
        }
        await commandExec.sendAsync(`Mass role operation ${massrole_id} has ${pendingCount} members still pending role assignments.`);
    }

    formatMassRole = (guild: Guild, mrm: MassRoleModel): string => {
        const ra = RoleAssignment.FromMassRoleModel(guild, mrm.user_id, mrm.addRoleIds, mrm.removeRoleIds, mrm.toggleRoleIds);
        if (ra === undefined){
            return "Error while trying to parse mass role operation.";
        }
        const filterRole = mrm.role_id === null ? undefined : guild.roles.cache.get(mrm.role_id);
        const roleFiltered = mrm.inRole !== null && filterRole !== undefined;
        const executor = `By: ${ra.Assigner}\n`;
        const roleFilter = (!roleFiltered) ? "" : ` ${mrm.inRole ? "" : "not "} in ${filterRole}`;
        const typeSelector = (mrm.bots && mrm.humans) ? "Members" : (mrm.bots ? "Bots" : "Humans");
        const target = `To: ${roleFiltered ? "" : "All "}${typeSelector}${roleFilter}`
        const tRoles = this.formatRoleList('Toggles', ra.toggle);
        const aRoles = this.formatRoleList('Adds', ra.add);
        const rRoles = this.formatRoleList('Removes', ra.remove);
        return `${executor}${target}${tRoles}${aRoles}${rRoles}`;
    }

    formatRoleList = (roleAssignmentType: string, roles: Role[]|null) : string => {
        if (roles === null || roles.length === 0) return "";
        return `\n${roleAssignmentType}: ${roles.join(' ')}`;
    }
}

export class RoleCancelCommand extends Command {
    public static readonly CommandName: string = 'role.cancel';

    constructor(){
        super({
            name: RoleCancelCommand.CommandName,
            parentCommand: RoleCommand.CommandName,
            category: 'admin',
            usage: 'role cancel <mass role ID>',
            description: 'Cancels a mass role assignment',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: ['role cancel 5'],
            defaultUserPermissions: ['MANAGE_ROLES']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const cancelArg = args.shift();
        if (cancelArg === undefined) {
            await commandExec.errorAsync('Invalid mass role ID.');
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        const massrole_id = parseInt(cancelArg);
        if (isNaN(massrole_id)){
            await commandExec.errorAsync('Invalid mass role ID.');
            return;
        }
        const massRole = await repo.MassRoles.select(commandExec.guild.id, massrole_id);
        if (massRole === undefined){
            await commandExec.errorAsync('Invalid mass role ID.');
            return;
        }
        MassRoleHandler.StopWorking(commandExec.guild.id, massrole_id);
        await repo.MassRoles.delete(commandExec.guild.id, massrole_id);
        await commandExec.sendAsync(`Cancelled mass role operation ${massRole.massrole_id}`);
    }
}

export const RoleCommands = [
    new RoleCommand(),
    new RoleMemberCommand(),
    new RoleAllCommand(),
    new RoleBotCommand(),
    new RoleHumanCommand(),
    new RoleInCommand(),
    new RoleNotInCommand(),
    new RoleStatusCommand(),
    new RoleCancelCommand()
];

enum RoleAssignmentType {
    Toggle = 0,
    Add = 1,
    Remove = 2
}

class RoleAssignment {
    public add: Role[]|null;
    public remove: Role[]|null;
    public toggle: Role[]|null;

    private _assigner: GuildMember;

    public get Assigner() {
        return this._assigner;
    }

    constructor(guild: Guild, assigner: GuildMember, args: string[]){
        this._assigner = assigner;
        this.add = null;
        this.remove = null;
        this.toggle = null;
        this.parseAllArgs(guild, args);
    }

    hasRoles = (): boolean => {
        if (this.add !== null && this.add.length > 0) return true;
        if (this.remove !== null && this.remove.length > 0) return true;
        if (this.toggle !== null && this.toggle.length > 0) return true;
        return false;
    }

    parseAllArgs = (guild: Guild, args: string[]) => {
        if (args.length === 0) return;
        const fullArgString = args.join(' ');
        let roleAssignmentType = RoleAssignmentType.Toggle;
        let currentRoleIdentifier: string = "";
        let inRoleName: boolean = false; // If we're not in a role name currently, we can skip spaces
        let followingSpaceOrComma: boolean = true;
        for(let i = 0; i< fullArgString.length; i++){
            const currentChar = fullArgString[i];
            if (currentChar === " ") {
                followingSpaceOrComma = true;
                if (inRoleName) currentRoleIdentifier = currentRoleIdentifier.concat(currentChar);
                continue;
            }
            if (followingSpaceOrComma){
                if (currentChar === "+" || currentChar === "-") {
                    if (inRoleName) {
                        this.parseRoleIdentifier(guild, currentRoleIdentifier, roleAssignmentType);
                        currentRoleIdentifier = "";
                    }
                    roleAssignmentType = currentChar === "+" ? RoleAssignmentType.Add : RoleAssignmentType.Remove;
                    inRoleName = false;
                    followingSpaceOrComma = false;
                    continue;
                }
            }
            if (currentChar === ",") {
                if (inRoleName) {
                    this.parseRoleIdentifier(guild, currentRoleIdentifier, roleAssignmentType);
                    currentRoleIdentifier = "";
                }
                inRoleName = false;
                followingSpaceOrComma = true;
                continue;
            }
            inRoleName = true;
            currentRoleIdentifier = currentRoleIdentifier.concat(currentChar);
        }
        if (inRoleName && currentRoleIdentifier.length > 0){
            this.parseRoleIdentifier(guild, currentRoleIdentifier, roleAssignmentType);
        }
    }

    formatIds = (roles: Role[]|null) : string|null => {
        if (roles === null || roles.length === 0) return null;
        return roles.map(r => r.id).join(',');
    }

    addIds = (guild: Guild, addRoleIds: string|null) => {
        if (addRoleIds === null) return;
        const self = this;
        const roleIDs = addRoleIds.split(',');
        roleIDs.forEach(r => self.parseRoleIdentifier(guild, r, RoleAssignmentType.Add));
    }

    removeIds = (guild: Guild, removeRoleIds: string|null) => {
        if (removeRoleIds === null) return;
        const self = this;
        const roleIDs = removeRoleIds.split(',');
        roleIDs.forEach(r => self.parseRoleIdentifier(guild, r, RoleAssignmentType.Remove));
    }

    toggleIds = (guild: Guild, toggleRoleIds: string|null) => {
        if (toggleRoleIds === null) return;
        const self = this;
        const roleIDs = toggleRoleIds.split(',');
        roleIDs.forEach(r => self.parseRoleIdentifier(guild, r, RoleAssignmentType.Toggle));
    }

    private parseRoleIdentifier = (guild: Guild, roleIdentifier: string, rType: RoleAssignmentType) => {
        if (roleIdentifier === undefined || roleIdentifier === null || roleIdentifier.length === 0) return;
        const roleName = roleIdentifier.trim().toLowerCase();
        if (roleName.length === 0) return;
        const role = Command.extractRoleMention(guild, roleName) || guild.roles.cache.get(roleName) || guild.roles.cache.find(x => x.name.toLowerCase() == roleName);
        const allowedRole = this.isRoleAllowed(role);
        switch(rType){
            case RoleAssignmentType.Toggle:
                this.toggleRole(allowedRole);
                break;
            case RoleAssignmentType.Add:
                this.addRole(allowedRole);
                break;
            case RoleAssignmentType.Remove:
                this.removeRole(allowedRole);
                break;
        }
    }

    private isRoleAllowed = (role: Role|undefined) : Role|undefined => {
        if (role === undefined) return undefined;
        if (role.permissions.has('ADMINISTRATOR')) return undefined; // Cannot use this to apply administrator
        if (this._assigner.permissions.has('ADMINISTRATOR')) return role;
        if (this._assigner.roles.highest.position < role.position) return undefined;
        return role;
    }

    private addRole = (role:Role|undefined) => {
        if (role === undefined) return;
        if (this.add === undefined || this.add === null) this.add = [];
        this.add.push(role);
    }

    private removeRole = (role:Role|undefined) => {
        if (role === undefined) return;
        if (this.remove === undefined || this.remove === null) this.remove = [];
        this.remove.push(role);
    }

    private toggleRole = (role:Role|undefined) => {
        if (role === undefined) return;
        if (this.toggle === undefined || this.toggle === null) this.toggle = [];
        this.toggle.push(role);
    }

    public static FromMassRoleModel = (guild: Guild, user_id: string, addRoleIds: string|null, removeRoleIds: string|null, toggleRoleIds: string|null) : RoleAssignment|undefined => {
        const member = guild.members.cache.get(user_id);
        if (member === undefined) return undefined;
        const roleAssignments = new RoleAssignment(guild, member, []);
        roleAssignments.addIds(guild, addRoleIds);
        roleAssignments.removeIds(guild, removeRoleIds);
        roleAssignments.toggleIds(guild, toggleRoleIds);
        return roleAssignments;
    }
}