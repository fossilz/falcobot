/**
 * Singleton pattern makes sure you only instantiate 1 instance
 * even if you import this class from several different files at once
 */
import DiscordClient from "./DiscordClient";

class Discord {
  static instance: DiscordClient;
  static semaphore = false;

  getInstance() {
    if (!Discord.instance && !Discord.semaphore) {
      Discord.semaphore = true;
      const instance = new DiscordClient();
      Discord.instance = instance;
    }
    return Discord.instance;
  }
}

export default Discord;
