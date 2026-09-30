import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  profile_img: { type: String },
  FullName: { type: String, index: true },
  Phone1: { type: String },
  Phone2: { type: String },
  Email: { type: String, index: true, unique: true },
  Password: { type: String },
  BirthDay: { type: Date },
  Gender: { type: String },
  About: { type: String },
  Address: { type: String },
  Country: { type: String },
  CountryIsoCode: { type: String },
  State: { type: String },
  StateIsoCode: { type: String },
  City: { type: String },
  CityIsoCode: { type: String },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
  resetPasswordToken: { type: String, default: undefined },
  resetPasswordExpires: { type: String, default: undefined },
});

const Employee = mongoose.model("Employee", EmployeeSchema);

export default Employee;
