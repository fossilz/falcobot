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
    }

    // @ts-ignore: abstract run definition
    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        throw new Error(`The ${this.name} command has no run() method`);
    }

    send = async (content: APIMessageContentResolvable | MessageAdditions, executionParameters?: CommandExecutionParameters) : Promise<Message|undefined> => {
        if (executionParameters === undefined || executionParameters.outputChannel === undefined) return;
        return await executionParameters.outputChannel.send(content);
    }

    error = async (content: string | undefined, executionParameters?: CommandExecutionParameters) : Promise<Message|undefined> => {
        if (executionParameters === undefined || executionParameters.outputChannel === undefined) return;
        if (content === undefined) return;
        return await executionParameters.outputChannel.send(`ERROR: ${content}`);
    }

    protected extractChannelIDFromMention = (mention: string) : string | undefined => {
        if (mention === undefined || mention === null) return;
        const matches = mention.match(/^<#(\d+)>$/);
        if (matches === null) return;
        return matches[1];
    }

    protected extractChannelMention = (message: Message, mention: string) : GuildChannel | undefined => {
        if (message === null || message.guild === null) return;
        const id = this.extractChannelIDFromMention(mention);
        if (id === undefined) return;
        return message.guild.channels.cache.get(id);
    }

    protected extractMemberIDFromMention = (mention: string) : string | undefined => {
        if (mention === undefined || mention === null) return;
        const matches = mention.match(/^<@!?(\d+)>$/);
        if (matches === null) return;
        return matches[1];
    }

    protected extractMemberMention = (message: Message, mention: string) : GuildMember | undefined => {
        if (message === null || message.guild === null) return;
        const id = this.extractMemberIDFromMention(mention);
        if (id === undefined) return;
        return message.guild.members.cache.get(id);
    }

    protected extractRoleMention = (message: Message, mention: string) : Role | undefined => {
        if (message === null || message.guild === null || mention === undefined || mention === null) return;
        const matches = mention.match(/^<@&(\d+)>$/);
        if (matches === null) return;
        const id = matches[1];
        return message.guild.roles.cache.get(id);
    }

    protected extractEmoji = (guild: Guild, mention: string) : string | undefined => {
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