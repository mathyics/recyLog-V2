import { Router } from 'express'
import { registerUser, loginUser, getCurrentUser, updateProfile, logoutUser, getLeaderboard } from '../controllers/user.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'

const router = Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/me', verifyJWT, getCurrentUser)
router.get('/leaderboard', verifyJWT, getLeaderboard)
router.post('/logout', verifyJWT, logoutUser)
router.put('/profile', verifyJWT, upload.single('avatar'), updateProfile)

export default router
