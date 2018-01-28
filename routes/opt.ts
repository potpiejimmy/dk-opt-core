import { Router, Request, Response, NextFunction } from "express";
import * as Opt from '../business/opt';

const OptRouter: Router = Router();

OptRouter.get("/init", function (request: Request, response: Response, next: NextFunction) {
    Opt.optInitialize()
    .then(res => response.json(res))
    .catch(err => next(err));
});

export { OptRouter };
