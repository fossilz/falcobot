import { APIMessageContentResolvable, Guild, GuildChannel, GuildMember, Message, MessageAdditions, PermissionString, Role } from 'discord.js';
import { CommandExecutionParameters } from '../behaviors/CommandHandler';

export interface ICommandSettings {
    name: string;
    category: string;
    usage?: string;
    description?: string;
    clientPermissions?: PermissionString[];
    defaultUserPermissions?: PermissionString[];
    examples?: string[];
    logByDefault?: boolean;
    suppressByDefault?: boolean;
    aliases?: string[];
    adminOnly?: boolean; // This overrides PermissionSet.  Use this only for the most important command that shouldn't be allocated to sub-Admin
}

export abstract class Command {
    public name: string;
    public category: string;
    public usage: string;
    public description: string;
    public clientPermissions: PermissionString[];
    public defaultUserPermissions: PermissionString[];
    public examples: string[];
    public logByDefault: boolean;
    public suppressByDefault: boolean;
    public aliases: string[];
    public adminOnly: boolean;

    constructor(options: ICommandSettings) {
        this.name = options.name;
        this.category = options.category;
        this.usage = options.usage || options.name;
        this.description = options.description || '';
        this.clientPermissions = options.clientPermissions || ['SEND_MESSAGES', 'EMBED_LINKS'];
        this.defaultUserPermissions = options.defaultUserPermissions || [];
        this.examples = options.examples || [];
        this.logByDefault = options.logByDefault ?? true;
        this.suppressByDefault = options.suppressByDefault ?? false;
        this.aliases = options.aliases ?? [];
        this.adminOnly = options.adminOnly ?? false;
    }

    // @ts-ignore: abstract run definition
    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        throw new Error(`The ${this.name} command has no run() method`);
    }

    public static send = async (content: APIMessageContentResolvable | MessageAdditions, executionParameters?: CommandExecutionParameters) : Promise<Message|undefined> => {
        if (executionParameters === undefined || executionParameters.outputChannel === undefined) return;
        return await executionParameters.outputChannel.send(content);
    }

    public static error = async (content: string | undefined, executionParameters?: CommandExecutionParameters) : Promise<Message|undefined> => {
        if (executionParameters === undefined || executionParameters.outputChannel === undefined) return;
        if (content === undefined) return;
        return await executionParameters.outputChannel.send(`ERROR: ${content}`);
    }

    public static extractChannelIDFromMention = (mention: string) : string | undefined => {
        if (mention === undefined || mention === null) return;
        const matches = mention.match(/^<#(\d+)>$/);
        if (matches === null) return;
        return matches[1];
    }

    public static extractChannelMention = (guild: Guild, mention: string) : GuildChannel | undefined => {
        const id = Command.extractChannelIDFromMention(mention);
        if (id === undefined) return;
        return guild.channels.cache.get(id);
    }

    public static extractMemberIDFromMention = (mention: string) : string | undefined => {
        if (mention === undefined || mention === null) return;
        const matches = mention.match(/^<@!?(\d+)>$/);
        if (matches === null) return;
        return matches[1];
    }

    public static extractMemberMention = (guild: Guild, mention: string) : GuildMember | undefined => {
        const id = Command.extractMemberIDFromMention(mention);
        if (id === undefined) return;
        return guild.members.cache.get(id);
    }

    public static extractRoleIDFromMention = (mention: string) : string | undefined => {
        if (mention === undefined || mention === null) return;
        const matches = mention.match(/^<@&(\d+)>$/);
        if (matches === null) return;
        return matches[1];
    }

    public static extractRoleMention = (guild: Guild, mention: string) : Role | undefined => {
        const id = Command.extractRoleIDFromMention(mention);
        if (id === undefined) return;
        return guild.roles.cache.get(id);
    }

    public static extractEmoji = (guild: Guild, mention: string) : string | undefined => {
        if (mention === undefined || mention === null) return;
        const emoteRegex = /<:.+:(\d+)>/gm
        const animatedEmoteRegex = /<a:.+:(\d+)>/gm
        const emoteMatch = emoteRegex.exec(mention);
        if (emoteMatch !== null) {
            const e = guild.emojis.cache.get(emoteMatch[1]);
            return e?.id;
        }
        const animationMatch = animatedEmoteRegex.exec(mention);
        if (animationMatch !== null) {
            const a = guild.emojis.cache.get(animationMatch[1]);
            return a?.id;
        }
        return mention;
    }
}