/*
    Web Audio Mix
*/

import "dotenv/config";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";

import log from "./utils/logger.ts";
import accessLogMiddleware from "./utils/middlewares/log.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const app = express();
const logger = log.getLogger();
const logAccess = log.getLogger("access");

app.use(helmet());
app.use(cors());
app.use(express.urlencoded({ "extended": true }));
app.use(express.json());
app.use(accessLogMiddleware(logAccess));
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
    logger.info(`Server is running on http://127.0.0.1:${PORT}`);
});
