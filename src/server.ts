import RepositoryFactory from "./classes/RepositoryFactory";
import { Discord, WebServer, DiscordClient } from "./index";

// Discord instance (using singleton pattern)
let dc: DiscordClient;

// Web server instance
let ws: WebServer;

const repo = RepositoryFactory.getInstanceAsync().then(() => {
  dc = Discord.getInstance();
  ws = new WebServer();

  ws.on("ready", async () => {
    console.log("Server ready");
    await dc.login();
  });
  
  dc.on("ready", async () => {
    console.log("Discord client ready");
  });
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
