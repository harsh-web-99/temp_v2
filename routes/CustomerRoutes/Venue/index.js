import express from "express";
const router = express.Router();

import {
  getAllVenueData,
  getVenuesBySearchKeyword,
  getVenueEvents,
} from "../../../controllers/CustomerController/Venue/index.js";

router.get("/getAllVenueData", getAllVenueData);

router.post("/getVenuesBySearchKeyword", getVenuesBySearchKeyword);

router.post("/getVenueEvents", getVenueEvents);

export default router;
