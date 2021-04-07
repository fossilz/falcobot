import { Message, MessageEmbed } from "discord.js";
import { Command } from "../Command";
import PermissionList from '../../utils/permissions';
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class RoleInfoCommand extends Command {
    constructor(){
        super({
            name: 'roleinfo',
            category: 'info',
            usage: 'roleinfo <role mention/ID>',
            description: 'Displays information on the provided role',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_ROLES'],
            logByDefault: false
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const guild = commandExec.guild;
        const member = commandExec.messageMember;
        
        const role = Command.extractRoleMention(guild, args[0]) || guild.roles.cache.get(args[0]);
        if (role == undefined) {
            await commandExec.errorAsync('No role found.');
            return;
        }
        if (!member.hasPermission('ADMINISTRATOR') && role.position > member.roles.highest.position) {
            await commandExec.errorAsync('Cannot get role info on a role above your own.');
            return;
        }

        // Get role permissions
        const permArray: string[] = [];
        const roleInfoPermissions = Object.values(PermissionList).filter(x => x.showRoleInfo).sort((a,b) => (a.sortOrder > b.sortOrder) ? 1 : -1);
        roleInfoPermissions.forEach(p => {
            if (role.permissions.has(p.permission)) {
                permArray.push(p.description);
            }
        });

        // Reverse role position
        const position = `\`${guild.roles.cache.size - role.position}\`/\`${guild.roles.cache.size}\``;

        const embed = new MessageEmbed()
            .setTitle('Role Information')
            .setThumbnail(guild.iconURL({ dynamic: true }) || '')
            .addField('Role', role, true)
            .addField('Role ID', `\`${role.id}\``, true)
            .addField('Position', position, true)
            .addField('Mentionable', `\`${role.mentionable}\``, true)
            .addField('Bot Role', `\`${role.managed}\``, true)
            .addField('Color', `\`${role.hexColor.toUpperCase()}\``, true)
            .addField('Members', `\`${role.members.size}\``, true)
            .addField('Hoisted', `\`${role.hoist}\``, true)
            .addField('Created On', `\`${role.createdAt}\``, true)
            .addField('Permissions', `\`\`\`${permArray.join(', ')}\`\`\``)
            .setFooter(member.displayName,  commandExec.messageAuthor.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(role.hexColor);
        await commandExec.sendAsync(embed);

        await commandExec.logDefaultAsync();
    }
}

export default RoleInfoCommand;