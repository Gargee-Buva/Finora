import { Schema, model, Document } from "mongoose";
import { compareValue, hashValue } from "../utils/bcrypt.js";

// ----------------------
// TYPES
// ----------------------
export interface IUser extends Document {
  name: string;
  email: string;
  profilePicture: string | null;
  password: string;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(password: string): Promise<boolean>;
  omitPassword(): IUserSafe;
}

// ✅ Export this so services can use it
export type IUserSafe = {
  _id: string;
  name: string;
  email: string;
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: true,
      select: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    if (this.password) {
      this.password = await hashValue(this.password);
    }
  }
  next();
});

// ✅ Omit password
userSchema.methods.omitPassword = function (): IUserSafe {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// ✅ Compare password
userSchema.methods.comparePassword = async function (password: string) {
  return compareValue(password, this.password);
};

const UserModel = model<IUser>("User", userSchema);

// ✅ Export both
export default UserModel;
