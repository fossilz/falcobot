import { Message } from "discord.js";
import { Discord, WebServer, DiscordClient } from "./index";

// Discord instance (using singleton pattern)
const dc = new Discord().getInstance();

// Discord instance (NOT using singleton pattern if you know your are NOT going to instantiate it anywhere else)
// const dc = new DiscordClient();

// Web server instance
const ws = new WebServer();

ws.on("ready", async () => {
  console.log("Server ready");
  await dc.login();
});

dc.on("ready", async () => {
  console.log("Discord client ready");
});

// You can either implement your logic within the Discord class
// or decouple the logic using the Event emitter and do it outside the class
// or create another class like DicordProtocol class that handles the messaging logic
// This way you are using more of a SOLID Design Principle
dc.on("message", async (msg: Message) => {
  console.log(msg.content);
  // ie. DicordProtocol.handleMessage(msg);
});

// ~~~~~~ Standard Process Exit Methods ~~~~~~~

const exitHandler = async function (options: any, exitCode: any) {
  if (options.cleanup) {
    // Put all cleanup logic here
    if (ws) ws.close();
    if (dc) dc.close();
  }
  if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
};

//do something when app is closing
process.on("exit", exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
