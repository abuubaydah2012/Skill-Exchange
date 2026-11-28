import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISubcategory extends Document {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubcategorySchema = new Schema<ISubcategory>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Parent category ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Subcategory name is required'],
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

SubcategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });

export const Subcategory = mongoose.model<ISubcategory>('Subcategory', SubcategorySchema);
