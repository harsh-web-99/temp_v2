import express from "express";
const router = express.Router();

import {
  BookEventTicketsByPromoter,
  cancelEventTicket,
  resendEventTicket,

  //Promoter Dashboard Bookings Controller Functions
  getPromoterLatestBookings,
  getEventSummaryBookingsDataByPromoterId,
  getEventSummaryBookingsDatabyFilter,
  getEventSummaryExcelReportbyFilter,
  getEventTransactionBookingsDataByPromoterId,
  getEventTransactionExcelReportByPromoterId,

  //SuperAdmin & Organizer Dashboard Bookings Controller Functions
  getPromoterLatestBookingsForSuperAdminOrganizer,
  downloadPromoterLatestBookingsForSuperAdminOrganizer,
  getOnlineLatestBookingsForSuperAdminOrganizer,
  downloadExcelOnlineLatestBookingsForSuperAdminOrganizer,
  getAllLatestBookingsForSuperAdminOrganizer,
  downloadExcelAllLatestBookingsForSuperAdminOrganizer,

  //SuperAdmin & Organizer Dashboard Events Bookings Controller Functions
  getEventSummaryBookingsDataforSuperAdminOrganizer,
  getEventSummaryBookingsDatabyFilterforSuperAdminOrganizer,
  getEventSummaryExcelReportbyFilterforSuperAdminOrganizer,
} from "../../../controllers/AdminControllers/EventTicketBooking/index.js";

router.post("/BookEventTicketsByPromoter", BookEventTicketsByPromoter);

router.post("/cancelEventTicket", cancelEventTicket);

router.post("/resendEventTicket", resendEventTicket);

//Promoter Dashboard Bookings Routes

router.post("/getPromoterLatestBookings", getPromoterLatestBookings);

router.post(
  "/getEventSummaryBookingsDataByPromoterId",
  getEventSummaryBookingsDataByPromoterId
);

router.post(
  "/getEventSummaryBookingsDatabyFilter",
  getEventSummaryBookingsDatabyFilter
);

router.post(
  "/getEventSummaryExcelReportbyFilter",
  getEventSummaryExcelReportbyFilter
);

router.post(
  "/getEventTransactionBookingsDataByPromoterId",
  getEventTransactionBookingsDataByPromoterId
);

router.post(
  "/getEventTransactionExcelReportByPromoterId",
  getEventTransactionExcelReportByPromoterId
);

//SuperAdmin & Organizer Dashboard Bookings Routes

router.post(
  "/getPromoterLatestBookingsForSuperAdminOrganizer",
  getPromoterLatestBookingsForSuperAdminOrganizer
);

router.post(
  "/downloadPromoterLatestBookingsForSuperAdminOrganizer",
  downloadPromoterLatestBookingsForSuperAdminOrganizer
);

router.post(
  "/getOnlineLatestBookingsForSuperAdminOrganizer",
  getOnlineLatestBookingsForSuperAdminOrganizer
);

router.post(
  "/downloadExcelOnlineLatestBookingsForSuperAdminOrganizer",
  downloadExcelOnlineLatestBookingsForSuperAdminOrganizer
);

router.post(
  "/getAllLatestBookingsForSuperAdminOrganizer",
  getAllLatestBookingsForSuperAdminOrganizer
);

router.post(
  "/downloadExcelAllLatestBookingsForSuperAdminOrganizer",
  downloadExcelAllLatestBookingsForSuperAdminOrganizer
);

//SuperAdmin & Organizer Dashboard Events Bookings Routes

router.post(
  "/getEventSummaryBookingsDataforSuperAdminOrganizer",
  getEventSummaryBookingsDataforSuperAdminOrganizer
);

router.post(
  "/getEventSummaryBookingsDatabyFilterforSuperAdminOrganizer",
  getEventSummaryBookingsDatabyFilterforSuperAdminOrganizer
);

router.post(
  "/getEventSummaryExcelReportbyFilterforSuperAdminOrganizer",
  getEventSummaryExcelReportbyFilterforSuperAdminOrganizer
);

export default router;
