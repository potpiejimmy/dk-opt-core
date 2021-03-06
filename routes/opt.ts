/**
 * (c) dk-opt-core - Online-Personalisierung von Terminals
 * February 4, 2018
 * 
 * A TypeScript based implementation of OPT
 * 
 * @author thorsten.liese@dieboldnixdorf.com
 */
import { Router, Request, Response, NextFunction } from "express";
import * as Opt from '../business/opt';

const OptRouter: Router = Router();

OptRouter.get("/preinit", function (request: Request, response: Response, next: NextFunction) {
    Opt.optPreInitialize()
    .then(res => response.json(res))
    .catch(err => next(err));
});

OptRouter.get("/outoforder", function (request: Request, response: Response, next: NextFunction) {
    Opt.optOutOfOrder()
    .then(res => response.json(res))
    .catch(err => next(err));
});

OptRouter.get("/register", function (request: Request, response: Response, next: NextFunction) {
    Opt.optRegister(request.query.type)
    .then(res => response.json(res))
    .catch(err => next(err));
});

OptRouter.get("/init", function (request: Request, response: Response, next: NextFunction) {
    Opt.optInitialize()
    .then(res => response.json(res))
    .catch(err => next(err));
});

OptRouter.get("/pers", function (request: Request, response: Response, next: NextFunction) {
    Opt.optPersonalize()
    .then(res => response.json(res))
    .catch(err => next(err));
});

export { OptRouter };
