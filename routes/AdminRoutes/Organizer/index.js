import express from "express";
const router = express.Router();

import {
  registerOrganizer,
  organizerLogin,
  getAllOrganizers,
  getOrganizerById,
  updateOrganizerProfileById,
  organizerChangePassword,
  getForgotPasswordLink,
  resetPassword,
  getOrganizerDataBySearchKeyword,
  getAllPaginatedOrganizerData,
  getOrganizerDataBySearchKeywordPaginated,
  organizerUpdatePassword,
  EnableOrganizer,
  DisableOrganizer,
  OrganizerTotalSalesData,
  getOrganizerSalesData,
  AddPaymentForEvent,
  getAllPaymentsDataforEvent,
  deleteEventPayment,
} from "../../../controllers/AdminControllers/Organizer/index.js";

router.post("/register", registerOrganizer);

router.post("/login", organizerLogin);

router.get("/getAll", getAllOrganizers);

router.post("/getById", getOrganizerById);

router.post("/updateProfile", updateOrganizerProfileById);

router.post("/changepassword", organizerChangePassword);

router.post("/getpasswordresetlink", getForgotPasswordLink);

router.post("/resetPassword/:token", resetPassword);

router.post(
  "/getOrganizerDataBySearchKeyword",
  getOrganizerDataBySearchKeyword
);

router.post("/getallpaginatedData", getAllPaginatedOrganizerData);

router.post("/getPaginatedSearch", getOrganizerDataBySearchKeywordPaginated);

router.post("/updatepassword", organizerUpdatePassword);

router.post("/enable", EnableOrganizer);

router.post("/disable", DisableOrganizer);

router.post("/totalSalesData", OrganizerTotalSalesData);

router.post("/salesData", getOrganizerSalesData);

router.post("/addPayment", AddPaymentForEvent);

router.post("/getAllEventsPayment", getAllPaymentsDataforEvent);

router.post("/deleteEventPayment", deleteEventPayment);

export default router;
