/**
 * Home Router
 * Url Path: http://localhost:4000/*
 */
import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_: Request, res: Response) => {
  return res.send("Home");
});

// Example of catching an error
router.get("/error", async (_: Request, res: Response) => {
  let data;

  try {
    res.statusCode = 200;
    throw new Error("Something bad happened");
  } catch (err) {
    res.statusCode = 500;
    data = { error: err.message };
  }

  return res.json(data);
});

export default router;
