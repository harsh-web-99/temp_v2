import mongoose from "mongoose";

const EventsSchema = new mongoose.Schema({
  event_id: {
    type: String,
    index: true,
  },
});

const OrganizerSchema = new mongoose.Schema({
  organizer_id: {
    type: String,
    index: true,
  },
});

const ScannerUserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  Username: { type: String, index: true, unique: true, required: true },
  Password: { type: String },
  UserType: { type: Number, index: true, required: true },
  organizer_id: { type: String },
  Events: [EventsSchema],
  Organizers: [OrganizerSchema],
  FilterationDateTime: { type: Date },
  createdAt: { type: String, required: true, required: true },
  CreatedBy: { type: String, required: true },
  createduser_id: { type: String, index: true, required: true },
  status: { type: Number, required: true, default: 1 },
});

const ScannerUser = mongoose.model("ScannerUser", ScannerUserSchema);

export default ScannerUser;
