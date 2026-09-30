import express from "express";
const router = express.Router();

import {
  BookEventTicketsByCustomer,
  createPaymentRoute,
  paymentSuccess,
  paymentFailed,
} from "../../../controllers/CustomerController/EventBooking/index.js";

router.post("/bookTicket", BookEventTicketsByCustomer);

router.post("/create/payment", createPaymentRoute);

router.post("/payment/success", paymentSuccess);

router.post("/payment/failed", paymentFailed);

export default router;
