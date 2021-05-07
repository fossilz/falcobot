import { Router, Response } from "express";
import { parseIntOrDefault } from "../../classes/utils/functions";
import { NewEggShuffleHandler } from "../../classes/behaviors/NewEggShuffleHandler";
import RepositoryFactory from "../../classes/RepositoryFactory";
import ApiController from "../interfaces/apiController.interface";
import RequestWithUser from "../interfaces/requestWithUser.interface";
import authenticate from "../middleware/auth.middleware";

export default class ShufflesController implements ApiController {
    public basePath: string = "/shuffles";
    public router = Router();

    constructor(){
        this.initializeMiddlewares();
        this.initializeControllers([]);
        this.initializeRoutes();
    }

    private initializeMiddlewares = () => {
        this.router.use(authenticate);
    }

    private initializeControllers = (controllers: ApiController[]) => {
        controllers.forEach((controller) => {
            this.router.use(controller.basePath, controller.router);
        });
    }

    private initializeRoutes = () => {
        this.router.get("/", this.getAllShuffles);
        this.router.get("/:lotteryId", this.getShuffle);
    }

    private getAllShuffles = async (request: RequestWithUser, res: Response) => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const limit = parseIntOrDefault(<string>request.query["limit"], 20);
        const offset = parseIntOrDefault(<string>request.query["offset"], 0);
        const historyItems = await repo.Shuffles.selectHistory(limit, offset);
        const lotteries = historyItems.map(x => NewEggShuffleHandler.getNeweggLotteryFromHistory(x));
        return res.send(lotteries);
    }

    private getShuffle = async (request: RequestWithUser, res: Response) => {
        const lotteryId = request.params["lotteryId"];
        const repo = await RepositoryFactory.getInstanceAsync();
        const historyModel = await repo.Shuffles.selectLottery(lotteryId);
        if (historyModel === undefined){
            res.status(404).send(`Lottery ${lotteryId} not found`);
            return;
        }
        const lottery = NewEggShuffleHandler.getNeweggLotteryFromHistory(historyModel);
        return res.send(lottery);
    }
}