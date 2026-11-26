import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  message: string;
  category: 'Appointments' | 'Sessions' | 'Messages' | 'Verifications' | 'Payments' | 'Complaints' | 'Announcements';
  relatedAppointmentId?: Types.ObjectId;
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for a notification'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: ['Appointments', 'Sessions', 'Messages', 'Verifications', 'Payments', 'Complaints', 'Announcements'],
      default: 'Appointments',
    },
    relatedAppointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: {
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

// Virtual aliases matching specification:
NotificationSchema.virtual('notificationType').get(function () {
  return this.category;
});
NotificationSchema.virtual('readStatus').get(function () {
  return this.isRead;
});

// Index for efficient user notification sorting & unread count
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
