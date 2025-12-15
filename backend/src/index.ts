import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import passport from "passport";
import Env from "./config/env.config.js";
import { HTTPSTATUS } from "./config/http.config.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import connectDatabase from "./config/database.config.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import transactionRoutes from "./routes/transaction.route.js";
import "./config/passport.config.js"; 
import { initializeCrons } from "./crons/index.js";
import reportRoutes from "./routes/report.route.js";
import { getDateRange } from "./utils/date.js";
import { get } from "http";
import analyticsRoutes from "./routes/analytics.route.js";

const app = express();
const BASE_PATH = Env.BASE_PATH || "/api";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// simple request logger to diagnose routes quickly
app.use((req, res, next) => {
  console.log("REQ:", req.method, req.originalUrl, "Auth:", req.headers.authorization);
  next();
});


app.use(
  cors({
    origin: Env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

// health
app.get("/", (req: Request, res: Response) => {
  res.status(HTTPSTATUS.OK).json({ message: "API is running" });
});



// mount routes (passport protection is handled inside route file)
app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/user`, userRoutes);
app.use(`${BASE_PATH}/transaction`, transactionRoutes);
app.use(`${BASE_PATH}/report`, reportRoutes); 
app.use(`${BASE_PATH}/analytics`, analyticsRoutes); 

// global error handler
app.use(errorHandler);


const startServer = async () => {
  try {
    await connectDatabase();
    if(Env.NODE_ENV === "development"){
      await initializeCrons();
    }
    

    app.listen(Env.PORT, () => {
      console.log(
        `🚀 Server is running on port ${Env.PORT} in ${Env.NODE_ENV} mode`
      );
    });
  } catch (err) {
    console.error("❌ Failed to connect database", err);
    process.exit(1);
  }
};

startServer();

