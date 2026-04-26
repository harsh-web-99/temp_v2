import mongoose from "mongoose";

const EventCitySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  CityName: { type: String, index: true },
  FilterationDateTime: { type: Date, required: true },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
});

const EventCity = mongoose.model("EventCities", EventCitySchema);

export default EventCity;
