import express from "express";
const router = express.Router();

import {
  createPromocode,
  getAllPromocodes,
  getPromocodeById,
  EnablePromocode,
  DisablePromocode,
  getPromoCodeDataBySearchKeyword,
  getAllPaginatedPromocodeData,
  getPromocodeDataBySearchKeywordPaginated,
} from "../../../controllers/AdminControllers/Promocode/index.js";

router.post("/create", createPromocode);

router.get("/getAll", getAllPromocodes);

router.post("/getById", getPromocodeById);

router.post("/enablePromocode", EnablePromocode);

router.post("/disablePromocode", DisablePromocode);

router.post("/searchKeyword", getPromoCodeDataBySearchKeyword);

router.post("/getallpaginatedData", getAllPaginatedPromocodeData);

router.post("/getPaginatedSearch", getPromocodeDataBySearchKeywordPaginated);

export default router;
