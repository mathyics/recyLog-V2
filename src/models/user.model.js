import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, unique: true, lowercase: true, index: true },
  email: { type: String, required: true, trim: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8, select: false },
  avatar: { type: String },
  points: { type: Number, default: 0 },
  totalItemsRecycled: { type: Number, default: 0 },
  co2Saved: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true })

userSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

userSchema.methods.isPasswordCorrect = async function(password){
  return bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    { _id: this._id, role: this.role },
    process.env.JWT_SECRET || 'changeme',
    { expiresIn: '1d' }
  )
}

export const User = mongoose.model('User', userSchema)
