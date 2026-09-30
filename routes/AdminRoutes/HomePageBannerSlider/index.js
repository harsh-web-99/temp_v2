import express from "express";
const router = express.Router();

import {
  createHomePageBannerSlider,
  getAllHomepageBannerSliderData,
  getHomePageBannerSliderDatabyId,
  updateHomepageBannerSliderData,
  deleteHomePageBannerSlider,
  getAllPaginatedHomePageSliderData,
} from "../../../controllers/AdminControllers/HomeBannerSlider/index.js";

router.post("/create", createHomePageBannerSlider);

router.get("/getAll", getAllHomepageBannerSliderData);

router.post("/getById", getHomePageBannerSliderDatabyId);

router.post("/updatebyId", updateHomepageBannerSliderData);

router.post("/deleteById", deleteHomePageBannerSlider);

router.post("/getallpaginatedData", getAllPaginatedHomePageSliderData);

export default router;
