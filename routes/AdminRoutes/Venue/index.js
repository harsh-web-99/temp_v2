import express from "express";
const router = express.Router();

import {
  createVenue,
  getAllVenue,
  getVenueById,
  updateVenueData,
  deleteVenueImage,
  uploadVenueImage,
  deleteVenue,
  getVenueDataBySearchKeyword,
  getAllPaginatedVenues,
  getVenueDataBySearchKeywordPaginated,
} from "../../../controllers/AdminControllers/Venue/index.js";

router.post("/create", createVenue);

router.get("/getall", getAllVenue);

router.post("/getVenueDataBySearchKeyword", getVenueDataBySearchKeyword);

router.post("/getById", getVenueById);

router.post("/update/data", updateVenueData);

router.post("/deleteVenue/image", deleteVenueImage);

router.post("/upload/image", uploadVenueImage);

router.post("/delete", deleteVenue);

router.post("/getallpaginatedData", getAllPaginatedVenues);

router.post("/getPaginatedSearch", getVenueDataBySearchKeywordPaginated);

export default router;
