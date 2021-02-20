/**
 * Discord Router
 * Url Path: http://localhost:4000/discord/*
 */
import { Router, Request, Response } from "express";
import Discord from "../classes/Discord";

const router = Router();

router.get("/", (_: Request, res: Response) => {
  return res.send("Discord Home");
});

// Example to send some JSON
router.get("/message", async (_: Request, res: Response) => {
  let data;

  try {
    res.statusCode = 200;
    data = { hello: "discord message" };
  } catch (err) {
    res.statusCode = 500;
    data = { error: err.message };
  }

  return res.json(data);
});

// Example to get a route param
router.get("/message/:name", async (req: Request, res: Response) => {
  const name = req.params?.name || "Jim";

  let data;

  try {
    res.statusCode = 200;
    data = { hello: name };
  } catch (err) {
    res.statusCode = 500;
    data = { error: err.message };
  }

  return res.json(data);
});

// Example post to send a test message (use Postman to send a post)
// In the POST request in postman, go to Body > Raw > Select JSON in the dropdown
// Add your json
router.post("/message", async (req: Request, res: Response) => {
  const body = req.body;

  const dc = new Discord().getInstance();
  await dc.login();

  let data;

  try {
    res.statusCode = 200;
    data = { body };
    // TODO: Implement
    // data = await dc.sendMessage(body?.message || "Test message");
  } catch (err) {
    res.statusCode = 500;
    data = { error: err.message };
  }

  return res.json(data);
});

export default router;
