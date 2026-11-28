import mongoose, { Document, Schema, Types } from 'mongoose';

export type DemoPaymentMethod = 'Visa' | 'Mastercard' | 'PayPal' | 'bKash' | 'Nagad';
export type PaymentTxStatus = 'Pending' | 'Completed' | 'Failed' | 'Cancelled' | 'Refunded';
export type RefundTxStatus =
  | 'None'
  | 'Requested'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Processing'
  | 'Refunded';

export interface IPaymentTransaction extends Document {
  _id: Types.ObjectId;
  transactionId: string;
  orderId: string;
  studentId: Types.ObjectId;
  studentName: string;
  teacherId: Types.ObjectId;
  teacherName: string;
  classId?: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  itemTitle: string;
  itemDescription?: string;
  paymentMethod: DemoPaymentMethod;
  amount: number;
  currency: string;
  status: PaymentTxStatus;
  isDemo: boolean;
  refundStatus: RefundTxStatus;
  refundReason?: string;
  refundExplanation?: string;
  adminResponse?: string;
  refundRequestedAt?: Date;
  refundProcessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
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
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'ClassSession',
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    itemTitle: {
      type: String,
      required: true,
      trim: true,
    },
    itemDescription: {
      type: String,
      default: '',
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Visa', 'Mastercard', 'PayPal', 'bKash', 'Nagad'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'Cancelled', 'Refunded'],
      default: 'Pending',
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: true,
    },
    refundStatus: {
      type: String,
      enum: ['None', 'Requested', 'Under Review', 'Approved', 'Rejected', 'Processing', 'Refunded'],
      default: 'None',
      index: true,
    },
    refundReason: {
      type: String,
      default: '',
      trim: true,
    },
    refundExplanation: {
      type: String,
      default: '',
      trim: true,
    },
    adminResponse: {
      type: String,
      default: '',
      trim: true,
    },
    refundRequestedAt: {
      type: Date,
    },
    refundProcessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentTransaction = mongoose.model<IPaymentTransaction>(
  'PaymentTransaction',
  PaymentTransactionSchema
);
