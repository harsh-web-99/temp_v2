import express from "express";
const router = express.Router();

import {
  registerPromoter,
  promoterLogin,
  getAllPromoters,
  getPromoterById,
  updatePromoterProfileById,
  promoterChangePassword,
  getPromoterForgotPasswordLink,
  promoterResetPassword,
  getPromoterDataBySearchKeyword,
  getAllPaginatedPromoterData,
  getPromoterDataBySearchKeywordPaginated,
  promoterUpdatePassword,
  EnablePromoter,
  DisablePromoter,
} from "../../../controllers/AdminControllers/Promoter/index.js";

router.post("/register", registerPromoter);

router.post("/login", promoterLogin);

router.get("/getAll", getAllPromoters);

router.post("/getById", getPromoterById);

router.post("/updateProfile", updatePromoterProfileById);

router.post("/changepassword", promoterChangePassword);

router.post("/getpasswordresetlink", getPromoterForgotPasswordLink);

router.post("/resetPassword/:token", promoterResetPassword);

router.post("/getPromoterDataBySearchKeyword", getPromoterDataBySearchKeyword);

router.post("/getallpaginatedData", getAllPaginatedPromoterData);

router.post("/getPaginatedSearch", getPromoterDataBySearchKeywordPaginated);

router.post("/updatepassword", promoterUpdatePassword);

router.post("/enable", EnablePromoter);

router.post("/disable", DisablePromoter);

export default router;
