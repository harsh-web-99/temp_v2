import dotenv from "dotenv";
import connectToDatabase from "./database/connection.js";
import { config } from "./config/index.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import cluster from "cluster";
import os from "os";
import bodyParser from "body-parser";

// Import routes
import {
  Artist,
  Category,
  Venue,
  Genre,
  SuperAdmin,
  Organizer,
  Promoter,
  ScannerUser,
  Events,
  EventsTickets,
  Smtp,
  EventTour,
  EventBulkTickets,
  WebsiteCustomers,
  HomePageBannerSlider,
  EventTicketBooking,
  Promocode,
} from "./routes/AdminRoutes/index.js";

import {
  Customer,
  WebisteArtist,
  WebisteCategory,
  WebisteVenue,
  WebisteHomepage,
  WebisteEvents,
  WebisteGenre,
  WebsiteEventTickets,
  WebsitePromocodes,
  WebsiteBooking,
  WebsiteLeads,
} from "./routes/CustomerRoutes/index.js";

// Import controllers
import { renderTicketbyBookingId } from "./controllers/AdminControllers/EventTickets/index.js";
import {
  updateEventStatusToCompleted,
  expirePromocodeStatus,
  releasePendingBookingTickets,
} from "./CronJobs/index.js";

// Load environment variables
dotenv.config();

// Number of CPU cores
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers for each CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Restart worker on exit
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection. In this case, it's an Express app.

  // Connect to the database
  connectToDatabase();

  // Initialize Express app
  const app = express();
  // app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  // Enable CORS
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      credentials: true,
    })
  );

  // Set view engine and static files
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use("/artist", Artist);
  app.use("/category", Category);
  app.use("/venue", Venue);
  app.use("/genre", Genre);
  app.use("/superadmin", SuperAdmin);
  app.use("/organizer", Organizer);
  app.use("/promoter", Promoter);
  app.use("/scanneruser", ScannerUser);
  app.use("/events", Events);
  app.use("/eventstickets", EventsTickets);
  app.use("/smtp", Smtp);
  app.use("/eventtour", EventTour);
  app.use("/eventbulktickets", EventBulkTickets);
  app.use("/websitecustomers", WebsiteCustomers);
  app.use("/homepagebannerslider", HomePageBannerSlider);
  app.use("/eventticketsbooking", EventTicketBooking);
  app.use("/promocode", Promocode);

  app.use("/webiste/customer", Customer);
  app.use("/webiste/artist", WebisteArtist);
  app.use("/webiste/category", WebisteCategory);
  app.use("/webiste/venue", WebisteVenue);
  app.use("/webiste/homepage", WebisteHomepage);
  app.use("/webiste/events", WebisteEvents);
  app.use("/webiste/genre", WebisteGenre);
  app.use("/webiste/eventtickets", WebsiteEventTickets);
  app.use("/webiste/promocodes", WebsitePromocodes);
  app.use("/webiste/bookticket", WebsiteBooking);
  app.use("/webiste/leads", WebsiteLeads);

  app.use("/uploads", express.static("uploads"));
  app.use("/Assets", express.static("Assets"));

  // Render ticket by booking ID
  app.get("/rndtckt/:Booking_id", renderTicketbyBookingId);

  // 404 page
  app.use("*", (req, res) => {
    res.status(404).render("404");
  });

  // Start the server on the worker process
  const port = config.backendPort || 3000;
  app.listen(port, () => {
    console.log(`Worker ${process.pid} is listening on port ${port}`);
  });

  // Cron jobs
  cron.schedule("0 */1 * * *", updateEventStatusToCompleted); // Runs every 1 hours
  cron.schedule("*/10 * * * *", expirePromocodeStatus); // Runs every 10 minutes
  cron.schedule("* * * * *", releasePendingBookingTickets); // Runs every minute
}
