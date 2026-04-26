import mongoose from "mongoose";

const ImagesSchema = new mongoose.Schema({
  image_path: {
    type: String,
    required: true,
  },
});

const GenreSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  Images: [ImagesSchema],
  Name: { type: String, index: true, required: true, unique: true },
  Description: { type: String },
  FilterationDateTime: { type: Date },
  createdAt: { type: String, required: true },
  status: { type: Number, required: true, default: 1 },
});

const Genre = mongoose.model("Genre", GenreSchema);

export default Genre;
