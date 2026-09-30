import mongoose from "mongoose";

const ImagesSchema = new mongoose.Schema({
  image_path: {
    type: String,
    required: true,
  },
});

const EventTourSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  Images: [ImagesSchema],
  Name: { type: String, index: true, required: true, unique: true },
  Description: { type: String },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  ActiveEvent: { type: Number, required: true, default: 1 },
  status: { type: Number, required: true, default: 1 },
});

const EventTour = mongoose.model("EventTour", EventTourSchema);

export default EventTour;
