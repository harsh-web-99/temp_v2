import express from "express";
const router = express.Router();

import {
  registerArtist,
  getAllArtist,
  getArtistById,
  updateArtistData,
  deleteArtistImage,
  uploadArtistImage,
  deleteArtist,
  getArtistDataBySearchKeyword,
  getAllPaginatedArtistData,
  getArtistDataBySearchKeywordPaginated,
} from "../../../controllers/AdminControllers/Artist/index.js";

router.post("/register", registerArtist);

router.get("/getall", getAllArtist);

router.post("/getbyId", getArtistById);

router.post("/update/data", updateArtistData);

router.post("/deleteArtist/image", deleteArtistImage);

router.post("/upload/image", uploadArtistImage);

router.post("/delete", deleteArtist);

router.post("/getArtistDataBySearchKeyword", getArtistDataBySearchKeyword);

router.post("/getallpaginatedData", getAllPaginatedArtistData);

router.post("/getPaginatedSearch", getArtistDataBySearchKeywordPaginated);

export default router;
