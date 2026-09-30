import mongoose from "mongoose";

const SmtpSchema = new mongoose.Schema({
  _id: { type: String },
  Port: { type: String },
  Host: { type: String },
  Username: { type: String },
  Password: { type: String },
  Encryption: { type: String },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String },
  status: { type: Number, required: true, default: 1 },
});

const Smtp = mongoose.model("Smtp", SmtpSchema);

export default Smtp;
