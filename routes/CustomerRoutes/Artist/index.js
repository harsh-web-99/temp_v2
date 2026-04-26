import express from "express";
const router = express.Router();

import {
  getAllArtistData,
  getArtistBySearchKeyword,
  getEventsByArtist,
} from "../../../controllers/CustomerController/Artist/index.js";

router.get("/getAllArtistData", getAllArtistData);

router.post("/getArtistBySearchKeyword", getArtistBySearchKeyword);

router.post("/getEventsByArtist", getEventsByArtist);

export default router;
