import * as express from 'express';
import { json } from 'body-parser';
import * as nocache from 'nocache';

import { optRouter } from "./routes/opt";

const app: express.Application = express();

app.use(nocache());
app.use(json());

app.get('/', (req, res) => res.send('OPT REST Interface running.'))

app.use("/opt", optRouter);

app.listen(3000, () => console.log('OPT REST listening on port 3000.'))
