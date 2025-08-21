import jwt from 'jsonwebtoken'
import { User } from '../models/user.model.js'

export const verifyJWT = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if(!token) return res.status(401).json({ error: 'Unauthorized' })

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme')
    const user = await User.findById(payload._id).select('-password')
    if(!user) return res.status(401).json({ error: 'Invalid token' })

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
