import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { uploadOnCloudinary } from '../utils/cloudnary.js'

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body
  if(!username || !email || !password){
    throw new ApiError(400, 'username, email and password are required')
  }

  const existed = await User.findOne({ $or: [{ email }, { username }] })
  if(existed){
    throw new ApiError(409, 'User with email or username already exists')
  }

  const user = await User.create({ username, email, password })
  const token = user.generateAccessToken()
  const safe = await User.findById(user._id).select('-password')

  return res.status(201).json(new ApiResponse(201, { user: safe, token }, 'User registered'))
})

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+password')
  if(!user) throw new ApiError(401, 'Invalid credentials')

  const ok = await user.isPasswordCorrect(password)
  if(!ok) throw new ApiError(401, 'Invalid credentials')

  const token = user.generateAccessToken()
  const safe = await User.findById(user._id).select('-password')
  return res.status(200).json(new ApiResponse(200, { user: safe, token }, 'Login successful'))
})

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, { user: req.user }))
})

export const updateProfile = asyncHandler(async (req, res) => {
  const updates = {}
  const { username, email, password } = req.body
  
  if(username) updates.username = username
  if(email) updates.email = email
  

  if(password) {
    const bcrypt = await import('bcryptjs')
    updates.password = await bcrypt.hash(password, 10)
  }

 
  if(req.file?.path){
    const uploaded = await uploadOnCloudinary(req.file.path)
    if(uploaded?.url){
      updates.avatar = uploaded.url
    }
  }

  const updated = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('-password')
  return res.status(200).json(new ApiResponse(200, { user: updated }, 'Profile updated'))
})

export const logoutUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, {}, 'Logged out'))
})

export const getLeaderboard = asyncHandler(async (req, res) => {
 
  const users = await User.find({})
    .select('username points totalItemsRecycled co2Saved')
    .sort({ points: -1 })
    .limit(20) 
  
  return res.status(200).json(
    new ApiResponse(200, { users }, 'Leaderboard retrieved successfully')
  )
})
