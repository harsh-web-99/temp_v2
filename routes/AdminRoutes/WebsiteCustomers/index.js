import express from "express";
const router = express.Router();

import {
  getAllWebCustomers,
  registerCustomerBySuperAdmin,
  getCustomerBookings,
  getAllPaginatedCustomersData,
  getCustomerDataBySearchKeywordPaginated,
} from "../../../controllers/AdminControllers/WebsiteCustomers/index.js";

router.get("/getall", getAllWebCustomers);

router.post("/customerRegistrationBySuperAdmin", registerCustomerBySuperAdmin);

router.post("/getCustomerBookings", getCustomerBookings);

router.post("/getAllPaginatedCustomersData", getAllPaginatedCustomersData);

router.post(
  "/getCustomerDataBySearchKeywordPaginated",
  getCustomerDataBySearchKeywordPaginated
);

export default router;
