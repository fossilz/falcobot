import DiscordClient from "../DiscordClient";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "ready",
    handler: async (client: DiscordClient) => {
        const tag = client.client.user?.tag || "User not found";
        console.log(`Logged in as ${tag}!`);
        client.emit('ready');
    }
};

export default handler;