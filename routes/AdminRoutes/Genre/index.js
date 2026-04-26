import express from "express";
const router = express.Router();

import {
  createGenre,
  getAllGenre,
  getGenreById,
  updateGenreData,
  deleteGenreImage,
  uploadGenreImage,
  deleteGenre,
  getGenreDataBySearchKeyword,
  getAllPaginatedGenre,
  getGenreDataBySearchKeywordPaginated,
} from "../../../controllers/AdminControllers/Genre/index.js";

router.post("/create", createGenre);

router.get("/getall", getAllGenre);

router.post("/getById", getGenreById);

router.post("/update/data", updateGenreData);

router.post("/deleteGenre/image", deleteGenreImage);

router.post("/upload/image", uploadGenreImage);

router.post("/delete", deleteGenre);

router.post("/getGenreDataBySearchKeyword", getGenreDataBySearchKeyword);

router.post("/getallpaginatedData", getAllPaginatedGenre);

router.post("/getPaginatedSearch", getGenreDataBySearchKeywordPaginated);

export default router;
