import express from "express";
const router = express.Router();

import {
  insertWebsiteLead,
  getAllPaginatedWebsiteLeadsData,
} from "../../../controllers/CustomerController/WebsiteLeads/index.js";

router.post("/insert", insertWebsiteLead);

router.post("/getAllPaginated", getAllPaginatedWebsiteLeadsData);

export default router;
