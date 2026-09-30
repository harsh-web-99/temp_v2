import express from "express";
const router = express.Router();

import {
  getAllOnlineEvents,
  getAllFeaturedEvents,
  getAllUpcomingEvents,
  getLiveEventsTour,
  getLiveEventTourDetailsbyId,
  getEventDetailsById,
  getEventDateTimeById,
} from "../../../controllers/CustomerController/Events/index.js";

router.post("/getAllOnlineEvents", getAllOnlineEvents);

router.post("/getAllFeaturedEvents", getAllFeaturedEvents);

router.post("/getAllUpcomingEvents", getAllUpcomingEvents);

router.post("/getLiveEventsTour", getLiveEventsTour);

router.post("/getLiveEventTourDetailsbyId", getLiveEventTourDetailsbyId);

router.post("/getEventDetailsById", getEventDetailsById);

router.post("/getEventDateTimeById", getEventDateTimeById);

export default router;
