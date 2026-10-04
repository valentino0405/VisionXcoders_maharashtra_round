import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  imageUrl?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  nationality?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  seatPreference?: string;
  dietaryPreference?: string;
  specialAssistance?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    firstName: { type: String },
    middleName: { type: String },
    lastName: { type: String },
    imageUrl: { type: String },
    phoneNumber: { type: String },
    dateOfBirth: { type: String },
    gender: { type: String },
    governmentIdType: { type: String },
    governmentIdNumber: { type: String },
    nationality: { type: String },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    seatPreference: { type: String },
    dietaryPreference: { type: String },
    specialAssistance: { type: String },
  },
  { 
    timestamps: true,
    collection: "users"
  }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
