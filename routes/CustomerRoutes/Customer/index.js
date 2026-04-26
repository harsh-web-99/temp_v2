import express from "express";
const router = express.Router();

import {
  generateOtp,
  validateOtp,
  getCustomerDataById,
  updateCustomerProfile,
  getCustomerBookedEventTickets,
} from "../../../controllers/CustomerController/Customer/index.js";

router.post("/generateotp", generateOtp);

router.post("/validatotp", validateOtp);

router.post("/getCustomerDataById", getCustomerDataById);

router.post("/updateCustomerProfile", updateCustomerProfile);

router.post("/get_booked_tickets", getCustomerBookedEventTickets);

export default router;
