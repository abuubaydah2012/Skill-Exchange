import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participantIds: Types.ObjectId[];
  appointmentId?: Types.ObjectId;
  teacherId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  lastMessageText: string;
  lastMessageTimestamp: Date;
  unreadCountForUser: Map<string, number>;
  deletedFor: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participantIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
    ],
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
      sparse: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    lastMessageText: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    lastMessageTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadCountForUser: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
