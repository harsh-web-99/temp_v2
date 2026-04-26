import mongoose from "mongoose";

const PromoterSchema = new mongoose.Schema({
  promoter_id: {
    type: String,
  },
});

const EventTicketsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  Event_id: { type: String, index: true, required: true },
  TicketType: { type: Number, index: true, required: true },
  EventDateTime_id: { type: String, index: true },
  Visibility: { type: Number, index: true, required: true },
  Promoters: [PromoterSchema],
  Name: { type: String, index: true, required: true },
  Description: { type: String },
  Price: { type: Number, required: true },
  Quantity: { type: Number, required: true },
  BookedQuantity: { type: Number, required: true, default: 0 },
  BookingMaxLimit: { type: Number, required: true },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  EventTicketStatus: { type: Number, required: true, default: 0 },
  EventTicketAvailability: { type: Number, required: true, default: 1 },
});

const EventTickets = mongoose.model("EventTickets", EventTicketsSchema);

export default EventTickets;
