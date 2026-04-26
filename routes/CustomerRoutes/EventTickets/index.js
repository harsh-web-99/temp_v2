import express from "express";
const router = express.Router();

import {
  getWebsiteTicketsbyEventDate,
  getWebsiteSeasonPass,
} from "../../../controllers/CustomerController/EventTickets/index.js";

router.post("/getWebsiteTicketsbyEventDate", getWebsiteTicketsbyEventDate);

router.post("/getWebsiteSeasonPass", getWebsiteSeasonPass);

export default router;
