/**
 * This is your main library interface
 * - Import this library to use in your server or application
 */
import * as config from "./config";

import DiscordClient from "./classes/DiscordClient";
import WebServer from "./classes/WebServer";
import Discord from "./classes/Discord";

export { config, Discord, DiscordClient, WebServer };
