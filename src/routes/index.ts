import { Router } from "express";

import home from "./home";
import discord from "./discord";

const routes = Router();

routes.use("/discord", discord);
routes.use("/", home);

export default routes;
