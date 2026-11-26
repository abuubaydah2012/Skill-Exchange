import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  reviewerId: Types.ObjectId;
  reviewedUserId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  sessionId?: string;
  sessionTitle?: string;
  skillName?: string;
  rating: number;
  comment: string;
  isFlagged: boolean;
  flagReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer ID is required'],
      index: true,
    },
    reviewedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewed User ID is required'],
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    sessionId: { type: String },
    sessionTitle: { type: String },
    skillName: { type: String },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating cannot be less than 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: 1000,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
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
ReviewSchema.virtual('reviewComment').get(function () {
  return this.comment;
});

// Post-save hook to recompute average rating on the reviewed user
ReviewSchema.post<IReview>('save', async function () {
  try {
    const aggregate = await mongoose.model('Review').aggregate([
      { $match: { reviewedUserId: this.reviewedUserId, isFlagged: false } },
      {
        $group: {
          _id: '$reviewedUserId',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (aggregate.length > 0) {
      await mongoose.model('User').findByIdAndUpdate(this.reviewedUserId, {
        rating: Math.round(aggregate[0].avgRating * 10) / 10,
        reviewCount: aggregate[0].count,
      });
    }
  } catch (err) {
    console.error('Error recomputing user rating:', err);
  }
});

ReviewSchema.index({ reviewedUserId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
