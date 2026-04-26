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
} from "../../../controllers/AdminControllers/Venue/index.js";

router.post("/create", createVenue);

router.get("/getall", getAllVenue);

router.post("/getById", getVenueById);

router.post("/update/data", updateVenueData);

router.post("/deleteVenue/image", deleteVenueImage);

router.post("/upload/image", uploadVenueImage);

router.post("/delete", deleteVenue);

export default router;
