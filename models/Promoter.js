import mongoose from "mongoose";

const PromoterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  profile_img: { type: String },
  FullName: { type: String, index: true },
  Phone1: { type: String },
  Phone2: { type: String },
  Username: { type: String, index: true, unique: true },
  Email: { type: String, index: true },
  Password: { type: String },
  Address: { type: String },
  Country: { type: String },
  CountryIsoCode: { type: String },
  State: { type: String },
  StateIsoCode: { type: String },
  City: { type: String },
  CityIsoCode: { type: String },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  CreatedBy: { type: String, required: true },
  createduser_id: { type: String, index: true, required: true },
  status: { type: Number, required: true, default: 1 },
  resetPasswordToken: { type: String, default: undefined },
  resetPasswordExpires: { type: String, default: undefined },
});

const Promoter = mongoose.model("Promoter", PromoterSchema);

export default Promoter;
