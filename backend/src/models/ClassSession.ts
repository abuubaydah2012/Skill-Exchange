import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IClassSession extends Document {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  teacherName: string;
  title: string;
  skillName: string;
  category: string;
  description: string;
  dateTime: Date;
  durationMinutes: number;
  capacity: number;
  enrolledUserIds: Types.ObjectId[];
  isFree: boolean;
  price: number;
  format: '1-on-1 Video' | 'Interactive Workshop' | 'Practice Lab';
  meetingLink: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSessionSchema = new Schema<IClassSession>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    dateTime: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
    },
    capacity: {
      type: Number,
      default: 15,
      min: 1,
    },
    enrolledUserIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    isFree: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    format: {
      type: String,
      enum: ['1-on-1 Video', 'Interactive Workshop', 'Practice Lab'],
      default: 'Interactive Workshop',
    },
    meetingLink: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
      index: true,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const ClassSession = mongoose.model<IClassSession>('ClassSession', ClassSessionSchema);
