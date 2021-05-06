import { Router } from "express";

export default interface ApiController {
    basePath: string;
    router: Router;
}