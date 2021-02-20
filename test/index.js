/**
 * Testing using ava
 * https://github.com/avajs/ava
 */
const test = require("ava");
const { config, Discord } = require("../dist");

// Discord instance (using singleton pattern)

test("config.port", (t) => {
  const { PORT } = config;
  t.is(PORT, 5000);
});

// Async test example
test("discord.login", async (t) => {
  const dc = new Discord().getInstance();
  const token = await dc.login();
  t.truthy(token);
});
