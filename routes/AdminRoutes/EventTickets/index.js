import express from "express";
const router = express.Router();

import {
  getAllEventTickets,
  createEventTicket,
  getEventTicketDetailsById,
  updateEventTicketbyId,
  UpdateTicketAvailabilityToSoldOut,
  UpdateTicketAvailabilityToAvailable,
  EnableEventTicket,
  DisableEventTicket,
  getTicketsByFilter,
  getPromoterTicketsbyEventDate,
  getPromoterSeasonPass,
  renderTicketbyBookingId,
  DownloadRenderedTicket,
} from "../../../controllers/AdminControllers/EventTickets/index.js";

router.post("/getAllEventTickets", getAllEventTickets);

router.post("/create", createEventTicket);

router.post("/getEventTicketDetailsById", getEventTicketDetailsById);

router.post("/updateEventTicketById", updateEventTicketbyId);

router.post("/updateAvailabilityToSoldOut", UpdateTicketAvailabilityToSoldOut);

router.post(
  "/updateAvailabilityToAvailable",
  UpdateTicketAvailabilityToAvailable
);

router.post("/enableEventTicket", EnableEventTicket);

router.post("/disableEventTicket", DisableEventTicket);

router.post("/getTicketsByFilter", getTicketsByFilter);

router.post("/getPromoterTicketsbyEventDate", getPromoterTicketsbyEventDate);

router.post("/getPromoterSeasonPass", getPromoterSeasonPass);

router.get("/render_ticket/:Booking_id", renderTicketbyBookingId);

router.get("/download-ticket-pdf/:Booking_id", DownloadRenderedTicket);

export default router;
