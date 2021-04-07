import { Message, MessageEmbed, Role } from "discord.js";
import { MemberFinder } from "../../behaviors/MemberFinder";
import { Command } from "../Command";
import PermissionList from '../../utils/permissions';
import RepositoryFactory from "../../RepositoryFactory";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { MemberNoteHelper } from "../../behaviors/MemberNoteHelper";
import moment from "moment";

class WhoisCommand extends Command {
    constructor(){
        super({
            name: 'whois',
            category: 'info',
            usage: 'whois [member mention/ID]',
            description: 'Displays information on the provided member',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['KICK_MEMBERS'],
            logByDefault: false
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const member = commandExec.messageMember;
        const guild = commandExec.guild;
        var repo = await RepositoryFactory.getInstanceAsync();

        let memberId = Command.extractMemberIDFromMention(args[0]) || args[0];
        if (memberId === undefined) {
            memberId = member.id;
        }
        const memberMatches = await MemberFinder.FindMember(guild, memberId);
        if (memberMatches.length === 0){
            await commandExec.errorAsync('No member found.');
            return;
        }

        if (memberMatches.length > 1) {
            // More than one member returned... ask for more detail
            const firstTenMembers = memberMatches.slice(0, 10);
            const matchEmbed = new MessageEmbed()
                .setTitle(`Members matching: ${args[0]} [${memberMatches.length}]`)
                .setTimestamp()
                .setDescription(firstTenMembers.map(x => MemberFinder.FormatMember(x)).join('\n') + ((memberMatches.length > 10) ? '\n... more ...' : ''));
                await commandExec.sendAsync(matchEmbed);
            return;
        }
        const gMember = memberMatches[0];
        const target = guild.members.cache.get(gMember.user_id);
        let roles: Role[] = [];
        let roleList: string | null = null;
        const permArray: string[] = [];

        if (target !== undefined) {
            roles = target.roles.cache.array().filter(x => x.id !== guild?.id);
            roleList = roles.join(' ');

            // Administrator covers all, so... just abbreviate
            if (target.hasPermission('ADMINISTRATOR')) {
                permArray.push('Administrator');
            } else {
                const memberPermissions = Object.values(PermissionList).filter(x => x.showWhois).sort((a,b) => (a.sortOrder > b.sortOrder) ? 1 : -1);
                memberPermissions.forEach(p => {
                    if (target.permissions.has(p.permission)) {
                        permArray.push(p.description);
                    }
                });
            }
        }

        const summary = await MemberNoteHelper.GetNoteSummary(repo, guild.id, gMember.user_id);

        const embed = new MessageEmbed()
            .setAuthor(`${gMember.user_name}#${gMember.user_discriminator}`, target?.user.avatarURL() || undefined)
            .setDescription(`<@!${gMember.user_id}>`)
            .setThumbnail(target?.user.avatarURL({ dynamic: true }) || '')
            .addField('Joined', moment(target?.joinedAt || new Date(gMember.joinedTimestamp || 0)).format('YYYY-MM-DD HH:mmZ'), true)
            .addField('Registered', target === undefined ? "Unknown" : moment(target.user.createdAt).format('YYYY-MM-DD HH:mmZ'), true)
            .setFooter(gMember.user_id)
            .setTimestamp()
            .setColor(target?.displayHexColor || commandExec.me.displayHexColor);
        if (gMember.bot) {
            embed.addField('Bot', 'True', true);
        }
        if (gMember.nickname) {
            embed.addField('Nickname', gMember.nickname, true);
        }
        if (roles.length > 0) {
            embed.addField(`Roles [${roles.length}]`, roleList)
        }
        if (permArray.length > 0) {
            embed.addField('Notable Permissions', permArray.join(', '))
        }
        if (summary.totalNotes() > 1) {
            const noteList: string[] = [];
            if (summary.noteCount > 0) noteList.push(`${summary.noteCount} note${summary.noteCount === 1 ? '' : 's'}`);
            if (summary.warnCount > 0) noteList.push(`${summary.warnCount} warning${summary.warnCount === 1 ? '' : 's'}`);
            if (summary.muteCount > 0) noteList.push(`${summary.muteCount} mute${summary.muteCount === 1 ? '' : 's'}`);
            if (summary.kickCount > 0) noteList.push(`${summary.kickCount} kick${summary.kickCount === 1 ? '' : 's'}`);
            if (summary.banCount > 0) noteList.push(`${summary.banCount} ban${summary.banCount === 1 ? '' : 's'}`);
            embed.addField('Notes', noteList.join('\n'));
        }
        await commandExec.sendAsync(embed);

        await commandExec.logDefaultAsync();
    }
}

export default WhoisCommand;