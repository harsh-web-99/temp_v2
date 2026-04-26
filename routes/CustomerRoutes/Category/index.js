import express from "express";
const router = express.Router();

import {
  getAllCategoryData,
  getCategoryEvents,
  getCategoriesBySearchKeyword,
} from "../../../controllers/CustomerController/Category/index.js";

router.get("/getAllCategoryData", getAllCategoryData);

router.post("/getCategoryEvents", getCategoryEvents);

router.post("/getCategoriesBySearchKeyword", getCategoriesBySearchKeyword);

export default router;
