import DiscordClient from "../DiscordClient";

interface IEventHandler {
    eventName: string;
    handler: (client: DiscordClient, ...args: any[]) => void|Promise<void>;
}
export default IEventHandler;