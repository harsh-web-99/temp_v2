import express from "express";
const router = express.Router();

import {
  createEventTour,
  getAllEventTour,
  getEventTourById,
  updateEventTourData,
  deleteEventTourImage,
  uploadEventTourImage,
  deleteEventTour,
  getEventTourDataBySearchKeyword,
  getAllPaginatedEventTours,
  getEventToursDataBySearchKeywordPaginated,
  EnableEventTour,
  DisableEventTour,
  getActiveEventTours,
} from "../../../controllers/AdminControllers/EventTour/index.js";

router.post("/create", createEventTour);

router.get("/getall", getAllEventTour);

router.post("/getbyId", getEventTourById);

router.post("/update/data", updateEventTourData);

router.post("/deleteEventTour/image", deleteEventTourImage);

router.post("/upload/image", uploadEventTourImage);

router.post("/delete", deleteEventTour);

router.post(
  "/getEventTourDataBySearchKeyword",
  getEventTourDataBySearchKeyword
);

router.post("/getallpaginatedData", getAllPaginatedEventTours);

router.post("/getPaginatedSearch", getEventToursDataBySearchKeywordPaginated);

router.post("/enable", EnableEventTour);

router.post("/disable", DisableEventTour);

router.get("/getActiveEventTours", getActiveEventTours);

export default router;
