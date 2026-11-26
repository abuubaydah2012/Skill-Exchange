import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICertificate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string;
  relatedSkill: string;
  documentUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileData?: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  rejectionReason?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for a certificate'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Certificate name/title is required'],
      trim: true,
      maxlength: 150,
    },
    issuingOrganization: {
      type: String,
      required: [true, 'Issuing organization is required'],
      trim: true,
      maxlength: 150,
    },
    issueDate: {
      type: String,
      required: [true, 'Issue date is required'],
    },
    expirationDate: {
      type: String,
    },
    relatedSkill: {
      type: String,
      required: [true, 'Related skill is required'],
    },
    documentUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    fileData: {
      type: String, // Base64 data URI or Cloud storage link
    },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
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
CertificateSchema.virtual('certificateName').get(function () {
  return this.title;
});
CertificateSchema.virtual('certificatePdfUrl').get(function () {
  return this.documentUrl || this.fileData;
});
CertificateSchema.virtual('verificationStatus').get(function () {
  return this.status;
});

CertificateSchema.index({ userId: 1, status: 1 });

export const Certificate = mongoose.model<ICertificate>('Certificate', CertificateSchema);
