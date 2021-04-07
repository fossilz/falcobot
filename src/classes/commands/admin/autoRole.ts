import { Guild, Message, MessageEmbed, Role } from "discord.js";
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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const initialParam = args.shift();
        switch (initialParam) {
            case 'add':
                await AutoRoleCommand.add(args, "ADD", commandExec);
                return;
            case 'remove':
                await AutoRoleCommand.add(args, "REMOVE", commandExec);
                return;
            case 'list':
                await AutoRoleCommand.list(commandExec);
                return;
            case 'delete':
                await AutoRoleCommand.delete(args, commandExec);
                return;
        }
        await commandExec.sendAsync('This should have a syntax helper, but it doesn\'t yet');
    }

    private static add = async (args: string[], add_remove: AddRemoveString, commandExec: CommandExecutionParameters) : Promise<void> => {
        const ar_verb = add_remove.toLowerCase();

        if (args.length < 1 || args.length > 3) {
            commandExec.errorAsync(`Invalid ${ar_verb} syntax.  Proper syntax is !autoRole ${ar_verb} <role ID/mention> [onadd|onremove] [role ID/mention]`);
            return;
        }

        const roleArg = args.shift();
        if (roleArg === undefined){
            commandExec.errorAsync(`Invalid ${ar_verb} syntax.  Proper syntax is !autoRole ${ar_verb} <role ID/mention> [onadd|onremove] [role ID/mention]`);
            return;
        }
        const role = Command.extractRoleMention(commandExec.guild, roleArg);
        if (role === undefined) {
            commandExec.errorAsync('Invalid role.');
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
                trigger_role = Command.extractRoleMention(commandExec.guild, triggerArg);
            }
        }

        var rrModel = new AutoRoleModel();
        rrModel.guild_id = commandExec.guild.id;
        rrModel.role_id = role.id;
        rrModel.add_remove = add_remove;
        if (trigger_role !== undefined && trigger_event !== undefined) {
            rrModel.trigger_role_id = trigger_role.id;
            rrModel.trigger_on_add_remove = trigger_event;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const autorole_id = await repo.AutoRoles.insert(rrModel);
        if (autorole_id !== undefined) {
            commandExec.sendAsync(`Auto role ${autorole_id} created.`);
        } else {
            commandExec.errorAsync('Could not create auto role.');
        }

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('Operation', 'create', true);
        commandLog.addField('Auto Role ID', autorole_id, true);
        commandLog.addField('Action', `${ar_verb} <@&${role.id}>`, true);
        if (trigger_role !== undefined && trigger_event !== undefined) {
            commandLog.addField('Trigger', `<@&${trigger_role.id}> ${AutoRoleCommand.formatAddRemoveVerb(trigger_event)}`);
        }
        await commandExec.logAsync(commandLog);
    }

    private static list = async (commandExec: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const arList = await repo.AutoRoles.selectAll(commandExec.guild.id);
        const listEmbed = new MessageEmbed()
            .setTitle('Auto Roles')
            .setTimestamp();
        if (arList.length === 0){
            listEmbed.setDescription('There are no auto roles setup.');
            commandExec.sendAsync(listEmbed);
            return;
        }
        let roleId: string|null = null;
        let fieldString: string|null = null;
        for(let i = 0; i < arList.length; i++) {
            const ar = arList[i];
            const rid = ar.role_id;
            if (rid !== roleId) {
                // Changed roles (potentially fields)
                AutoRoleCommand.addRoleField(commandExec.guild, roleId, listEmbed, fieldString);
                fieldString = null;
                roleId = rid;
            }
            if (fieldString !== null) { 
                fieldString = fieldString + '\n';
            } else fieldString = '';
            fieldString = fieldString + `${ar.autorole_id}: ${AutoRoleCommand.formatTriggerEvent(ar)}`;
        }
        AutoRoleCommand.addRoleField(commandExec.guild, roleId, listEmbed, fieldString);
        commandExec.sendAsync(listEmbed);

        await commandExec.logDefaultAsync();
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

    private static delete = async (args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild_id = commandExec.guild.id;

        const ar_id = args.shift();
        if (ar_id === undefined){
            commandExec.errorAsync('Proper syntax is !autoRole delete <auto role id>');
            return;
        }
        let autorole_id: number;
        try {
            autorole_id = parseInt(ar_id);
        } catch (err) {
            commandExec.errorAsync('Invalid Auto Role ID.  Proper syntax is !autoRole delete <auto role id>');
            return;
        }
        if (isNaN(autorole_id)) {
            commandExec.errorAsync('Invalid Auto Role ID.  Proper syntax is !autoRole delete <auto role id>');
            return;
        }

        const repo = await RepositoryFactory.getInstanceAsync();
        const ar = await repo.AutoRoles.select(guild_id, autorole_id);
        if (ar === undefined){
            commandExec.errorAsync('Invalid Auto Role ID.  Proper syntax is !autoRole delete <auto role id>');
            return;
        }

        await repo.AutoRoles.delete(guild_id, autorole_id);
        commandExec.sendAsync(`Auto role ${autorole_id} deleted.`);

        const commandLog = commandExec.getCommandLog();
        if (commandLog === null) return;
        commandLog.addField('Operation', 'delete', true);
        commandLog.addField('Auto Role ID', autorole_id, true);
        commandLog.addField('Action', `${ar.add_remove} <@&${ar.role_id}>`, true);
        if (ar.trigger_role_id !== null && ar.trigger_on_add_remove !== null) {
            commandLog.addField('Trigger', `<@&${ar.trigger_role_id}> ${AutoRoleCommand.formatAddRemoveVerb(ar.trigger_on_add_remove)}`);
        }
        await commandExec.logAsync(commandLog);
    }
}

export default AutoRoleCommand;