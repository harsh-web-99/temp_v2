import express from "express";
const router = express.Router();

import {
  superAdminCreateEvent,
  superAdminUpdateEvent,
  addNewEventDateTimeInEvent,
  updateEventDateTime,
  deleteEventDateTime,
  addEventFaq,
  deleteEventFaq,
  updateEventFaq,
  organizerCreateEvent,
  organizerUpdateEvent,
  getEventById,
  getTimingsEventById,
  deleteEventCarouselImage,
  uploadEventCarouselImage,
  deleteEventGalleryImage,
  uploadEventGalleryImage,
  getAllEventCities,
  getAllEvents,
  getSuperAdminSelfCreatedEvents,
  getDraftEvents,
  getReviewEvents,
  getPublishEvents,
  getCompletedEvents,
  addPromoterToEvent,
  getEventsAssignedPromoters,
  getRejectedEvents,
  getAllPaginatedEvents,
  getPaginatedSuperAdminSelfCreatedEvents,
  getPaginatedDraftEvents,
  getPaginatedReviewEvents,
  getPaginatedPublishEvents,
  getPaginatedCompletedEvents,
  getPaginatedRejectedEvents,
  getEventsByEventNameSearch,
  EnableEvent,
  DisableEvent,
  getAllEventsForPromotersDashboard,
  getEventsReportsForPromoters,
  getEventsByNameandDateTime,
  getVenueCitiesandPromoterDataforEvents,
} from "../../../controllers/AdminControllers/Events/index.js";

router.post("/superAdmin/create", superAdminCreateEvent);

router.post("/superAdmin/update", superAdminUpdateEvent);

router.post("/organizer/create", organizerCreateEvent);

router.post("/organizer/update", organizerUpdateEvent);

router.post("/update/DateTime", updateEventDateTime);

router.post("/add/DateTime", addNewEventDateTimeInEvent);

router.post("/delete/DateTime", deleteEventDateTime);

router.post("/update/Faq", updateEventFaq);

router.post("/add/Faq", addEventFaq);

router.post("/delete/Faq", deleteEventFaq);

router.post("/getbyId", getEventById);

router.post("/geteventDateTime", getTimingsEventById);

router.post("/delete/carouselimg", deleteEventCarouselImage);

router.post("/upload/carouselimg", uploadEventCarouselImage);

router.post("/delete/galleryimg", deleteEventGalleryImage);

router.post("/upload/galleryimg", uploadEventGalleryImage);

router.post("/getAllEventCities", getAllEventCities);

router.post("/getAll", getAllEvents);

router.post("/getSuperAdminSelfCreatedEvents", getSuperAdminSelfCreatedEvents);

router.post("/getDraftEvents", getDraftEvents);

router.post("/getReviewEvents", getReviewEvents);

router.post("/getPublishEvents", getPublishEvents);

router.post("/getCompletedEvents", getCompletedEvents);

router.post("/getRejectedEvents", getRejectedEvents);

router.post("/getAllPaginated", getAllPaginatedEvents);

router.post(
  "/getPaginatedSuperAdminSelfCreatedEvents",
  getPaginatedSuperAdminSelfCreatedEvents
);

router.post("/getPaginatedDraftEvents", getPaginatedDraftEvents);

router.post("/getPaginatedReviewEvents", getPaginatedReviewEvents);

router.post("/getPaginatedPublishEvents", getPaginatedPublishEvents);

router.post("/getPaginatedCompletedEvents", getPaginatedCompletedEvents);

router.post("/getPaginatedRejectedEvents", getPaginatedRejectedEvents);

router.post("/addpromoter", addPromoterToEvent);

router.post("/getEventPromoters", getEventsAssignedPromoters);

router.post("/getEventsByEventNameSearch", getEventsByEventNameSearch);

router.post("/enableEvent", EnableEvent);

router.post("/disableEvent", DisableEvent);

router.post(
  "/getAllEventsForPromotersDashboard",
  getAllEventsForPromotersDashboard
);

router.post("/getEventsReportsForPromoters", getEventsReportsForPromoters);

router.post("/getEventsByNameandDateTime", getEventsByNameandDateTime);

router.post(
  "/getVenueCitiesandPromoterDataforEvents",
  getVenueCitiesandPromoterDataforEvents
);

export default router;
