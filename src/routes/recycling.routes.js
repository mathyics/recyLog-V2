import { Router } from "express";
import { logRecycling, getUserStats } from "../controllers/recycling.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All recycling routes require authentication
router.use(verifyJWT);

// Log recycling activity
router.post("/log", logRecycling);

// Get user recycling stats
router.get("/stats", getUserStats);

export default router;
