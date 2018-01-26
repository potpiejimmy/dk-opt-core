import { Router, Request, Response, NextFunction } from "express";
import * as Hsm from '../business/hsm';

const HsmRouter: Router = Router();

HsmRouter.get("/:id", function (request: Request, response: Response, next: NextFunction) {
    Hsm.readValue(request.params.id)
    .then(res => response.send(res))
    .catch(err => next(err));
});

HsmRouter.put("/:id", function (request: Request, response: Response, next: NextFunction) {
    Hsm.writeValue(request.params.id, request.body.value)
    .then(res => response.send(res))
    .catch(err => next(err));
});

export { HsmRouter };
