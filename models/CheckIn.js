import mongoose from "mongoose";

const CheckInSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  event_id: { type: String, index: true, required: true },
  TicketType: { type: String, index: true, required: true },
  BulkTicketBatchId: { type: String },
  EventTicketId: { type: String },
  Booking_id: { type: String, index: true, required: true },
  Scanneruser_id: { type: String, index: true, required: true },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
});

const CheckIn = mongoose.model("CheckIn", CheckInSchema);

export default CheckIn;
