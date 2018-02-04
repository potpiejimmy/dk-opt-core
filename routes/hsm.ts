/**
 * (c) dk-opt-core - Online-Personalisierung von Terminals
 * February 4, 2018
 * 
 * A TypeScript based implementation of OPT
 * 
 * @author thorsten.liese@dieboldnixdorf.com
 */
import { Router, Request, Response, NextFunction } from "express";
import * as Hsm from '../business/hsm';

const HsmRouter: Router = Router();

HsmRouter.get("/admin", function (request: Request, response: Response, next: NextFunction) {
    Hsm.readAdminValues()
    .then(res => response.send(res))
    .catch(err => next(err));
});

HsmRouter.get("/admin/:id", function (request: Request, response: Response, next: NextFunction) {
    Hsm.readAdminValue(request.params.id)
    .then(res => response.send(res))
    .catch(err => next(err));
});

HsmRouter.put("/admin/:id", function (request: Request, response: Response, next: NextFunction) {
    Hsm.writeAdminValue(request.params.id, request.body.value)
    .then(res => response.send(res))
    .catch(err => next(err));
});

HsmRouter.get("/keystore", function (request: Request, response: Response, next: NextFunction) {
    Hsm.readKeyProperties()
    .then(res => response.send(res))
    .catch(err => next(err));
});

export { HsmRouter };
