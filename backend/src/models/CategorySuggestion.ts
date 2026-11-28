import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategorySuggestion extends Document {
  _id: Types.ObjectId;
  type: 'category' | 'subcategory';
  name: string;
  parentCategoryId?: Types.ObjectId;
  parentCategoryName?: string;
  description?: string;
  reason?: string;
  suggestedBy: Types.ObjectId;
  suggestedByName?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySuggestionSchema = new Schema<ICategorySuggestion>(
  {
    type: {
      type: String,
      enum: ['category', 'subcategory'],
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Suggested name is required'],
      trim: true,
      maxlength: 100,
    },
    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    parentCategoryName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    suggestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    suggestedByName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const CategorySuggestion = mongoose.model<ICategorySuggestion>(
  'CategorySuggestion',
  CategorySuggestionSchema
);
