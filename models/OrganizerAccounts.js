import mongoose from "mongoose";

const OrganizerAccountsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  event_id: { type: String, index: true, required: true },
  Date: { type: String },
  Remark: { type: String },
  AmountRecived: { type: Number },
  FilterationDateTime: { type: Date },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
});

const OrganizerAccounts = mongoose.model(
  "OrganizerAccounts",
  OrganizerAccountsSchema
);

export default OrganizerAccounts;
