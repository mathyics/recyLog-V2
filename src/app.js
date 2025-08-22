import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ApiError } from "./utils/ApiError.js";
import userRouter from "./routes/user.routes.js";
import recyclingRouter from "./routes/recycling.routes.js";

const app = express();


app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());


app.use("/api/v1/users", userRouter);
app.use("/api/v1/recycling", recyclingRouter);


app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});


app.get('/', (req, res) => {
    res.status(200).json({
        message: 'RecycLog API Server',
        version: '1.0.0',
        endpoints: {
            users: '/api/v1/users',
            recycling: '/api/v1/recycling',
            health: '/health'
        }
    });
});


app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors
        });
    }
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        errors: []
    });
});

export { app };
