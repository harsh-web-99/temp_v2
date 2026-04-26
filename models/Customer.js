import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  profile_img: { type: String },
  MobileNumber: { type: Number, unique: true },
  Otp: { type: Number, default: undefined },
  OtpExpiryTime: { type: Number, default: undefined },
  Email: { type: String, index: true },
  CustomerName: { type: String, index: true },
  BirthDay: { type: String },
  Identity: { type: String },
  AddressLine1: { type: String },
  AddressLine2: { type: String },
  Landmark: { type: String },
  City: { type: String },
  State: { type: String },
  Pincode: { type: Number },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
  RegistrationType: { type: Number, required: true },
});

const Customer = mongoose.model("Customer", CustomerSchema);

export default Customer;
