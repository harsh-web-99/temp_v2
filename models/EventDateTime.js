import mongoose from "mongoose";

const EventDateTimeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  Event_id: { type: String, required: true, index: true },
  EventStartDateTime: { type: Date, required: true },
  EventEndDateTime: { type: Date, required: true },
  status: { type: Number, required: true, default: 0 },
});

const EventDateTimeModel = mongoose.model("EventDateTime", EventDateTimeSchema);

export default EventDateTimeModel;
