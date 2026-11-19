import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = (req.headers["x-request-id"] as string) ?? randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url === "/api/health" },
  })
);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
