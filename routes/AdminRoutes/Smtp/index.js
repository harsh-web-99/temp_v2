import express from "express";
const router = express.Router();

import {
  registerSmtp,
  getSmtpDetails,
  updateSmtpDetails,
} from "../../../controllers/AdminControllers/Smtp/index.js";

router.post("/register", registerSmtp);

router.get("/get", getSmtpDetails);

router.post("/updatebyId", updateSmtpDetails);

export default router;
