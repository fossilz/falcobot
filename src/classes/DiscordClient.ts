import { EventEmitter } from "events";
import { Client, Message } from "discord.js";
import { DISCORD_TOKEN } from "../config";
import eventHandlers from './events';

class DiscordClient extends EventEmitter {
  client: Client;

  constructor() {
    // Since we are extending the EventEmitter class, we need to call super();
    super();
    this.init();
  }

  public close() {
    // Do any cleanup
    if (this.client) this.client.destroy();
  }

  private init() {
    this.client = new Client();

    eventHandlers.forEach((eh) => {
      this.client.on(eh.eventName,eh.handler.bind(null,this));
    });

    /*this.client.on("ready", () => {
      const tag = this.client.user?.tag || "User not found";
      console.log(`Logged in as ${tag}!`);

      // Since our DiscordClient extends EventEmitter,
      // we can listen to events from this class from the
      // file or object that instantiated this class
      // You can use this technique to decouple logic outside of this class
      this.emit("ready");
    });

    // I would create a 'protocol' to handle different types of messages
    this.client.on("message", (msg) => {
      if (msg.content === "ping") {
        this.handlePingMessage(msg);
      }

      // Handle messages outside of this class if you want
      this.emit("message", msg);
    });*/


  }

  private handlePingMessage(msg: Message) {
    msg.reply("Pong!");
  }

  // Placing a ? makes the arg optional
  public async login(token?: string) {
    return await this.client.login(token || DISCORD_TOKEN);
  }

  public async sendMessage(message: string) {
    // TODO: Implement
    return message;
  }
}

export default DiscordClient;
