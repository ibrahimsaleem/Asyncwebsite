import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set.");
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

// Serve uploaded files statically
const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

// Serve built frontend statically in production
const frontendDistDir = path.resolve(workspaceRoot, "artifacts/aisync/dist/public");
app.use(express.static(frontendDistDir));

// Fallback for React client-side routing (Single Page Application)
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(frontendDistDir, "index.html"));
});

export default app;
