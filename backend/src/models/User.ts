import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserIdentityVerification {
  status: 'Pending' | 'Verified' | 'Rejected';
  documentType: 'National ID (NID)' | 'Birth Certificate';
  documentNumber: string;
  documentFileName: string;
  documentFileSize: number;
  documentUrl?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  countryCode?: string;
  dateOfBirth?: string;
  age?: number;
  role: 'learner' | 'teacher' | 'admin';
  avatarUrl: string;
  avatarBgColor: string;
  headline: string;
  bio: string;
  location: string;
  languages: string[];
  learningInterests: string[];
  identityVerification?: IUserIdentityVerification;
  accountVerificationStatus: 'Pending Verification' | 'Verified' | 'Rejected' | 'Unverified';
  isProfileVerified: boolean;
  isSuspended: boolean;
  twoFactorEnabled: boolean;
  profileVisibility: 'public' | 'members-only' | 'private';
  rating: number;
  reviewCount: number;
  completedSessionsCount: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const IdentityVerificationSchema = new Schema<IUserIdentityVerification>(
  {
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
    },
    documentType: {
      type: String,
      enum: ['National ID (NID)', 'Birth Certificate'],
      required: true,
    },
    documentNumber: { type: String, required: true },
    documentFileName: { type: String, required: true },
    documentFileSize: { type: Number, required: true },
    documentUrl: { type: String },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Never return password in queries unless explicitly selected
    },
    phoneNumber: { type: String, trim: true },
    countryCode: { type: String, trim: true, default: '+1' },
    dateOfBirth: { type: String },
    age: { type: Number },
    role: {
      type: String,
      enum: ['learner', 'teacher', 'admin'],
      default: 'learner',
      index: true,
    },
    avatarUrl: { type: String, default: '' },
    avatarBgColor: { type: String, default: '#0284c7' },
    headline: { type: String, default: '', maxlength: 200 },
    bio: { type: String, default: '', maxlength: 2000 },
    location: { type: String, default: '' },
    languages: { type: [String], default: [] },
    learningInterests: { type: [String], default: [], index: true },
    identityVerification: { type: IdentityVerificationSchema },
    accountVerificationStatus: {
      type: String,
      enum: ['Pending Verification', 'Verified', 'Rejected', 'Unverified'],
      default: 'Unverified',
    },
    isProfileVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false, index: true },
    twoFactorEnabled: { type: Boolean, default: false },
    profileVisibility: {
      type: String,
      enum: ['public', 'members-only', 'private'],
      default: 'public',
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    completedSessionsCount: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Password hashing middleware before saving user
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: unknown) {
    next(err as Error);
  }
});

// Compare entered password with stored hash
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
