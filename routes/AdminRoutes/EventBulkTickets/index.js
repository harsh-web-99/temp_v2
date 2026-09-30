import express from "express";
const router = express.Router();

import {
  createBulkTicketForEvent,
  getBulkTicketsOfEvent,
  cancelBukTicket,
  exportBulkTicketBookingIds,
  getBulkTicketsByFilter,
} from "../../../controllers/AdminControllers/EventBulkTicket/index.js";

router.post("/createBulkTicketForEvent", createBulkTicketForEvent);

router.post("/getBulkTicketsOfEvent", getBulkTicketsOfEvent);

router.post("/cancelBukTicket", cancelBukTicket);

router.post("/exportBulkTicketBookingIds", exportBulkTicketBookingIds);

router.post("/getBulkTicketsByFilter", getBulkTicketsByFilter);

export default router;
