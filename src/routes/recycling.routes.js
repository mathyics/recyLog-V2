import { Router } from "express";
import { logRecycling, getUserStats } from "../controllers/recycling.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();


router.use(verifyJWT);


router.post("/log", logRecycling);


router.get("/stats", getUserStats);

export default router;
