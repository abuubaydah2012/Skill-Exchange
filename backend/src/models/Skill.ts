import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISkill extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string; // Skill name
  category: string;
  subcategory?: string;
  categoryId?: Types.ObjectId;
  subcategoryId?: Types.ObjectId;
  description: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  skillType: 'Teaching' | 'Learning';
  yearsExperience: number;
  freeSwapAvailable: boolean;
  paidLessonAvailable: boolean;
  hourlyPrice: number;
  availabilitySchedule: string;
  verificationStatus: 'Unverified' | 'Pending' | 'Verified';
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema = new Schema<ISkill>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for a skill'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: 100,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Skill category is required'],
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Subcategory',
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Skill description is required'],
      trim: true,
      maxlength: 1000,
    },
    proficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Intermediate',
    },
    skillType: {
      type: String,
      enum: ['Teaching', 'Learning'],
      default: 'Teaching',
      index: true,
    },
    yearsExperience: {
      type: Number,
      default: 1,
      min: 0,
      max: 60,
    },
    freeSwapAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    paidLessonAvailable: {
      type: Boolean,
      default: false,
    },
    hourlyPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    availabilitySchedule: {
      type: String,
      default: 'Flexible schedule',
    },
    verificationStatus: {
      type: String,
      enum: ['Unverified', 'Pending', 'Verified'],
      default: 'Unverified',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual alias matching specification:
SkillSchema.virtual('skillName').get(function () {
  return this.name;
});
SkillSchema.virtual('experienceLevel').get(function () {
  return this.proficiency;
});
SkillSchema.virtual('pricing').get(function () {
  return {
    isFree: this.freeSwapAvailable,
    hourlyPrice: this.hourlyPrice,
    currency: 'USD',
  };
});

// Composite index for fast marketplace search & category filters
SkillSchema.index({ category: 1, subcategory: 1, skillType: 1, freeSwapAvailable: 1 });
SkillSchema.index({ name: 'text', description: 'text' });

export const Skill = mongoose.model<ISkill>('Skill', SkillSchema);
