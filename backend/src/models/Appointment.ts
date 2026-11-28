import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAppointment extends Document {
  _id: Types.ObjectId;
  learnerId: Types.ObjectId; // Student ID
  learnerName?: string;
  learnerAvatarUrl?: string;
  learnerAvatarBgColor?: string;
  learnerHeadline?: string;
  teacherId: Types.ObjectId; // Teacher ID
  teacherName?: string;
  teacherAvatarUrl?: string;
  teacherAvatarBgColor?: string;
  skillId: Types.ObjectId;   // Skill ID
  skillName: string;
  requestedDate: string;     // YYYY-MM-DD
  startTime: string;         // HH:mm
  durationMinutes: number;   // Duration in minutes
  isFreeSwap: boolean;
  offeredSwapSkillName?: string;
  hourlyPrice: number;
  totalCost: number;
  message: string;
  appointmentType: 'Free' | 'Paid';
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Completed';
  rejectionReason?: string;
  cancellationReason?: string;
  meetingId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student/Learner ID is required'],
      index: true,
    },
    learnerName: {
      type: String,
      default: '',
    },
    learnerAvatarUrl: {
      type: String,
      default: '',
    },
    learnerAvatarBgColor: {
      type: String,
      default: '#0284c7',
    },
    learnerHeadline: {
      type: String,
      default: '',
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher ID is required'],
      index: true,
    },
    teacherName: {
      type: String,
      default: '',
    },
    teacherAvatarUrl: {
      type: String,
      default: '',
    },
    teacherAvatarBgColor: {
      type: String,
      default: '#059669',
    },
    skillId: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: [true, 'Skill ID is required'],
      index: true,
    },
    skillName: {
      type: String,
      required: [true, 'Skill name is required'],
    },
    requestedDate: {
      type: String,
      required: [true, 'Appointment date is required (YYYY-MM-DD)'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (HH:mm)'],
    },
    durationMinutes: {
      type: Number,
      required: true,
      default: 60,
    },
    isFreeSwap: {
      type: Boolean,
      default: true,
    },
    offeredSwapSkillName: {
      type: String,
    },
    hourlyPrice: {
      type: Number,
      default: 0,
    },
    totalCost: {
      type: Number,
      default: 0,
    },
    message: {
      type: String,
      default: '',
    },
    appointmentType: {
      type: String,
      enum: ['Free', 'Paid'],
      default: 'Free',
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled', 'Completed'],
      default: 'Pending',
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    cancellationReason: {
      type: String,
    },
    meetingId: {
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
AppointmentSchema.virtual('studentId').get(function () {
  return this.learnerId;
});
AppointmentSchema.virtual('appointmentDate').get(function () {
  return this.requestedDate;
});
AppointmentSchema.virtual('duration').get(function () {
  return this.durationMinutes;
});
AppointmentSchema.virtual('price').get(function () {
  return this.totalCost;
});

// Composite indexes for user session queries:
AppointmentSchema.index({ learnerId: 1, status: 1 });
AppointmentSchema.index({ teacherId: 1, status: 1 });
AppointmentSchema.index({ requestedDate: 1, status: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
