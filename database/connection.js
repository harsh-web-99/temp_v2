import mongoose from "mongoose";

const connectDatabase = () => {
  const isProduction = process.env.IS_PRODUCTION;
  const uri =
    isProduction == "true"
      ? process.env.MONGO_PRODUCTION_URL
      : process.env.MONGO_LOCAL_URL;

  if (!uri) {
    console.error("MongoDB URI not found in environment variables");
    process.exit(1);
  }

  const DbUsing =
    isProduction == "true" ? "Production Database" : "Local Database";

  mongoose.set("strictQuery", true);

  mongoose
    .connect(uri)
    .then(() => console.log(`Connected to ${DbUsing}`))
    .catch((err) => {
      console.error(`Error connecting to ${DbUsing}:`, err);
      process.exit(1);
    });

  mongoose.connection.on("error", (err) => {
    console.error(`MongoDB ${DbUsing} connection error:`, err);
  });

  mongoose.connection.on("disconnected", () => {
    console.log(`MongoDB ${DbUsing} disconnected`);
  });
};

export default connectDatabase;
