import express from "express";
const router = express.Router();

import {
  getAllBannerSliderData,
  searchEventsVenues,
} from "../../../controllers/CustomerController/Homepage/index.js";

router.get("/getAllBannerSliderData", getAllBannerSliderData);

router.post("/searchEventsVenues", searchEventsVenues);

export default router;
