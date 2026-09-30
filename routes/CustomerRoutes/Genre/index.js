import express from "express";
const router = express.Router();

import {
  getAllGenreData,
  getGenreBySearchKeyword,
  getGenreEvents,
} from "../../../controllers/CustomerController/Genre/index.js";

router.get("/getAllGenreData", getAllGenreData);

router.post("/getGenreBySearchKeyword", getGenreBySearchKeyword);

router.post("/getGenreEvents", getGenreEvents);

export default router;
