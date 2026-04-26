import mongoose from "mongoose";

const WebsiteLeadsSchema = new mongoose.Schema({
  _id: { type: String },
  FullName: { type: String },
  Email: { type: String },
  Position: { type: String },
  City: { type: String },
  PhoneNumber: { type: String },
  CompanyName: { type: String },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String },
  status: { type: Number, required: true, default: 1 },
});

const WebsiteLeads = mongoose.model("WebsiteLeads", WebsiteLeadsSchema);

export default WebsiteLeads;
