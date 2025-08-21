import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ApiError } from "./utils/ApiError.js";
import userRouter from "./routes/user.routes.js";
import recyclingRouter from "./routes/recycling.routes.js";

const app = express();

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:8000",
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/recycling", recyclingRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Serve the main page at root
app.get('/', (req, res) => {
    res.sendFile('public/index.html', { root: '.' });
});

// Global error handler
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
