/**
 * Environment config file
 * Loads .env file into process.env[...variables declared in file]
 * Make sure this config.js file is imported first in your server/index/app/etc.
 *
 * To import in another file:
 * import { DISCORD_TOKEN, PORT, CORS_ORIGIN } from "./config"
 */
import "dotenv-safe/config"; // Loads .env file into process.env

// Setup CORS Origin to allow requests to this server (or allow everything with *)
export const CORS_ORIGIN: string = process.env.CORS_ORIGIN ?? "*";

// Express Server Port
export const PORT: number = +(process.env.PORT ?? 5000);

// Discord authentication token
export const DISCORD_TOKEN: string = process.env.DISCORD_TOKEN;

// Sqlite db path
export const SQLITE_FILENAME: string = process.env.SQLITE_FILENAME;

// superping troll target
export const SCREW_THIS_GUY: string = process.env.SCREW_THIS_GUY;

// static API token
export const API_STATIC_TOKEN: string = process.env.API_STATIC_TOKEN;

// static API token resolves to this UserID
export const API_STATIC_USERID: string = process.env.API_STATIC_USERID;