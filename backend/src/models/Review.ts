import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  reviewerId: Types.ObjectId;
  reviewedUserId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  sessionId?: string;
  sessionTitle?: string;
  skillName?: string;
  title?: string;
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
    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },
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
      index: true,
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

// Prevent duplicate reviews for the same appointment by the same reviewer
ReviewSchema.index(
  { appointmentId: 1, reviewerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      appointmentId: { $exists: true },
    },
  }
);

ReviewSchema.virtual('reviewComment').get(function () {
  return this.comment;
});

export const recomputeUserRating = async (reviewedUserId: Types.ObjectId | string) => {
  const userObjId =
    typeof reviewedUserId === 'string'
      ? new mongoose.Types.ObjectId(reviewedUserId)
      : reviewedUserId;

  const aggregate = await mongoose.model('Review').aggregate([
    { $match: { reviewedUserId: userObjId, isFlagged: false } },
    {
      $group: {
        _id: '$reviewedUserId',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (aggregate.length > 0) {
    const avg = Math.round(aggregate[0].avgRating * 100) / 100;
    const count = aggregate[0].count;
    await mongoose.model('User').findByIdAndUpdate(userObjId, {
      rating: avg,
      reviewCount: count,
    });
    return { rating: avg, reviewCount: count };
  } else {
    await mongoose.model('User').findByIdAndUpdate(userObjId, {
      rating: 0,
      reviewCount: 0,
    });
    return { rating: 0, reviewCount: 0 };
  }
};

ReviewSchema.post<IReview>('save', async function () {
  try {
    await recomputeUserRating(this.reviewedUserId);
  } catch (err) {
    console.error('Error recomputing user rating on save:', err);
  }
});

ReviewSchema.post('findOneAndDelete', async function (doc: IReview | null) {
  if (doc) {
    try {
      await recomputeUserRating(doc.reviewedUserId);
    } catch (err) {
      console.error('Error recomputing user rating on delete:', err);
    }
  }
});

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
