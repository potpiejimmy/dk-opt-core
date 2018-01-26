import { Router, Request, Response, NextFunction } from "express";
import * as Opt from '../business/opt';

const optRouter: Router = Router();

optRouter.get("/init", function (request: Request, response: Response, next: NextFunction) {
    Opt.optInitialize()
    .then(res => response.send("<pre>"+res+"</pre>"))
    .catch(err => next(err));
});

export { optRouter };
