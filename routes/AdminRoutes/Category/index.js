import express from "express";
const router = express.Router();

import {
  createCategory,
  getAllCategory,
  getAllPaginatedCategory,
  getCategoryById,
  updateCategoryData,
  deleteCategoryImage,
  uploadCategoryImage,
  deleteCategory,
  getCategoryDataBySearchKeyword,
  getCategoryDataBySearchKeywordPaginated,
} from "../../../controllers/AdminControllers/Category/index.js";

router.post("/create", createCategory);

router.get("/getall", getAllCategory);

router.post("/getbyId", getCategoryById);

router.post("/update/data", updateCategoryData);

router.post("/deleteCategory/image", deleteCategoryImage);

router.post("/upload/image", uploadCategoryImage);

router.post("/delete", deleteCategory);

router.post("/getCategoryDataBySearchKeyword", getCategoryDataBySearchKeyword);

router.post("/getallpaginatedData", getAllPaginatedCategory);

router.post("/getPaginatedSearch", getCategoryDataBySearchKeywordPaginated);

export default router;
