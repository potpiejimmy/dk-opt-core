/**
 * (c) dk-opt-core - Online-Personalisierung von Terminals
 * February 4, 2018
 * 
 * A TypeScript based implementation of OPT
 * 
 * @author thorsten.liese@dieboldnixdorf.com
 */
import * as express from 'express';
import { json } from 'body-parser';
import * as nocache from 'nocache';

import { OptRouter } from "./routes/opt";
import { HsmRouter } from "./routes/hsm";

const app: express.Application = express();

app.use(nocache());
app.use(json());

// add CORS headers
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", req.headers.origin); // XXX do not allow all origins for production
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    next();
});
  
app.get('/', (req, res) => res.send('OPT REST Interface running.'))

app.use("/opt", OptRouter);
app.use("/hsm", HsmRouter);

app.listen(3000, () => console.log('OPT REST listening on port 3000.'))
