import express from "express";
const router = express.Router();

import { getPromocodesforWebsite, applyPromocodeForWebsite } from "../../../controllers/CustomerController/Promocode/index.js";

router.post("/getPromocodesforWebsite", getPromocodesforWebsite);

router.post("/applyPromocodeForWebsite", applyPromocodeForWebsite);

export default router;
