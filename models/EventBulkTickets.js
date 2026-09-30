import mongoose from "mongoose";

const BulkTicketsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  event_id: { type: String, index: true },
  eventName: { type: String, required: true },
  VenueName: { type: String, required: true },
  VenueCity: { type: String, required: true },
  TicketName: { type: String, index: true, required: true },
  CustomerName: { type: String, required: true },
  PhoneNumber: { type: Number, required: true },
  Email: { type: String, required: true },
  EventDateTime_id: { type: String, index: true },
  EventDate: { type: String, required: true },
  EventTime: { type: String, required: true },
  Price: { type: Number, required: true },
  Booking_id: { type: String, index: true, required: true, unique: true },
  Batch_id: { type: String, index: true, required: true },
  Check_In: { type: Number, index: true, required: true, default: 0 },
  CreatedBy: { type: String, required: true },
  createduser_id: { type: String, index: true, required: true },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
});

const BulkTickets = mongoose.model("BulkTickets", BulkTicketsSchema);

export default BulkTickets;
