import { Guild, Message, MessageEmbed, Role } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import { AutoRoleModel, AddRemoveString } from "../../dataModels/AutoRoleModel";

class AutoRoleCommand extends Command {
    constructor(){
        super({
            name: 'autorole',
            category: 'admin',
            usage: 'autoRole add|remove|list|pending|delete',
            description: 'Sets up automatic roles on server join or other role changes',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['autoRole add @NewMember', 'autoRole remove @Newb onadd @3080-us'],
            logByDefault: true,
            adminOnly: true
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        
        const staffLog = StaffLog.FromCommandContext(this, message.guild, message.author, message.channel, message.content, executionParameters);

        const initialParam = args.shift();
        switch (initialParam) {
            case 'add':
                await AutoRoleCommand.add(message.guild, args, "ADD", staffLog, executionParameters);
                return;
            case 'remove':
                await AutoRoleCommand.add(message.guild, args, "REMOVE", staffLog, executionParameters);
                return;
            case 'list':
                await AutoRoleCommand.list(message.guild, args, staffLog, executionParameters);
                return;
            case 'delete':
                await AutoRoleCommand.delete(message.guild, args, staffLog, executionParameters);
                return;
        }
        message.channel.send('This should have a syntax helper, but it doesn\'t yet');
    }

    private static add = async (guild: Guild, args: string[], add_remove: AddRemoveString, staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const ar_verb = add_remove.toLowerCase();

        if (args.length < 1 || args.length > 3) {
            Command.error(`Invalid ${ar_verb} syntax.  Proper syntax is !autoRole ${ar_verb} <role ID/mention> [onadd|onremove] [role ID/mention]`, executionParameters);
            return;
        }

        const roleArg = args.shift();
        if (roleArg === undefined){
            Command.error(`Invalid ${ar_verb} syntax.  Proper syntax is !autoRole ${ar_verb} <role ID/mention> [onadd|onremove] [role ID/mention]`, executionParameters);
            return;
        }
        const role = Command.extractRoleMention(guild, roleArg);
        if (role === undefined) {
            Command.error('Invalid role.', executionParameters);
            return;
        }
        const triggered = args.length > 0;
        let trigger_event: AddRemoveString|undefined = undefined;
        let trigger_role: Role|undefined = undefined;

        if (triggered) {
            let triggerArg = args.shift();
            if (triggerArg?.toLowerCase() === 'onadd'){
                trigger_event = "ADD";
                triggerArg = args.shift();
            } else if (triggerArg?.toLowerCase() === 'onremove') {
                trigger_event = "REMOVE";
                triggerArg = args.shift();
            } else {
                trigger_event = 'ADD';
            }
            if (triggerArg !== undefined) {
                trigger_role = Command.extractRoleMention(guild, triggerArg);
            }
        }

        var rrModel = new AutoRoleModel();
        rrModel.guild_id = guild.id;
        rrModel.role_id = role.id;
        rrModel.add_remove = add_remove;
        if (trigger_role !== undefined && trigger_event !== undefined) {
            rrModel.trigger_role_id = trigger_role.id;
            rrModel.trigger_on_add_remove = trigger_event;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const autorole_id = await repo.AutoRoles.insert(rrModel);
        if (autorole_id !== undefined) {
            Command.send(`Auto role ${autorole_id} created.`, executionParameters);
        } else {
            Command.error('Could not create auto role.', executionParameters);
        }

        if (staffLog === null) return;
        staffLog.addField('Operation', 'create', true);
        staffLog.addField('Auto Role ID', autorole_id, true);
        staffLog.addField('Action', `${ar_verb} <@&${role.id}>`, true);
        if (trigger_role !== undefined && trigger_event !== undefined) {
            staffLog.addField('Trigger', `<@&${trigger_role.id}> ${AutoRoleCommand.formatAddRemoveVerb(trigger_event)}`);
        }
        await staffLog.send();
    }

    private static list = async (guild: Guild, _: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const arList = await repo.AutoRoles.selectAll(guild.id);
        const listEmbed = new MessageEmbed()
            .setTitle('Auto Roles')
            .setTimestamp();
        if (arList.length === 0){
            listEmbed.setDescription('There are no auto roles setup.');
            Command.send(listEmbed, executionParameters);
            return;
        }
        let roleId: string|null = null;
        let fieldString: string|null = null;
        for(let i = 0; i < arList.length; i++) {
            const ar = arList[i];
            const rid = ar.role_id;
            if (rid !== roleId) {
                // Changed roles (potentially fields)
                AutoRoleCommand.addRoleField(guild, roleId, listEmbed, fieldString);
                fieldString = null;
                roleId = rid;
            }
            if (fieldString !== null) { 
                fieldString = fieldString + '\n';
            } else fieldString = '';
            fieldString = fieldString + `${ar.autorole_id}: ${AutoRoleCommand.formatTriggerEvent(ar)}`;
        }
        AutoRoleCommand.addRoleField(guild, roleId, listEmbed, fieldString);
        Command.send(listEmbed, executionParameters);

        await staffLog?.send();
    }

    private static addRoleField = (guild: Guild, roleId: string|null, embed: MessageEmbed, fieldString: string|null) => {
        if (fieldString === null || roleId === null) return;
        const role = guild.roles.cache.get(roleId);
        const roleName = role === undefined ? "Unknown Role" : `@${role.name}`;
        embed.addField(roleName + " (" + roleId + ")", fieldString);
    }

    private static formatTriggerEvent = (autoRole: AutoRoleModel) : string => {
        if (autoRole.trigger_role_id === null){
            return `${autoRole.add_remove} on server join.`;
        }
        const trigger_condition = autoRole.trigger_on_add_remove || "ADD";
        return `${autoRole.add_remove} on <@&${autoRole.trigger_role_id}> ${AutoRoleCommand.formatAddRemoveVerb(trigger_condition)}`;
    }

    private static formatAddRemoveVerb = (ar: AddRemoveString) : string => {
        if (ar === "ADD") return "added";
        if (ar === "REMOVE") return "removed";
        return "";
    }

    private static delete = async (guild: Guild, args: string[], staffLog: StaffLog|null, executionParameters?: CommandExecutionParameters) : Promise<void> => {
        const guild_id = guild.id;

        const ar_id = args.shift();
        if (ar_id === undefined){
            Command.error('Proper syntax is !autoRole delete <auto role id>', executionParameters);
            return;
        }
        let autorole_id: number;
        try {
            autorole_id = parseInt(ar_id);
        } catch (err) {
            Command.error('Invalid Auto Role ID.  Proper syntax is !autoRole delete <auto role id>', executionParameters);
            return;
        }
        if (isNaN(autorole_id)) {
            Command.error('Invalid Auto Role ID.  Proper syntax is !autoRole delete <auto role id>', executionParameters);
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const ar = await repo.AutoRoles.select(guild_id, autorole_id);
        if (ar === undefined){
            Command.error('Invalid Auto Role ID.  Proper syntax is !autoRole delete <auto role id>', executionParameters);
            return;
        }

        await repo.AutoRoles.delete(guild_id, autorole_id);
        Command.send(`Auto role ${autorole_id} deleted.`, executionParameters);

        if (staffLog === null) return;
        staffLog.addField('Operation', 'delete', true);
        staffLog.addField('Auto Role ID', autorole_id, true);
        staffLog.addField('Action', `${ar.add_remove} <@&${ar.role_id}>`, true);
        if (ar.trigger_role_id !== null && ar.trigger_on_add_remove !== null) {
            staffLog.addField('Trigger', `<@&${ar.trigger_role_id}> ${AutoRoleCommand.formatAddRemoveVerb(ar.trigger_on_add_remove)}`);
        }
        await staffLog.send();
    }
}

export default AutoRoleCommand;