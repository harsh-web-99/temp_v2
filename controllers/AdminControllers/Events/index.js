import {
  Organizer,
  SuperAdmin,
  Employee,
  Promoter,
  Event,
} from "../../../models/AllModels.js";
import {
  validateSuperAdminEventCreation,
  validateSuperAdminEventUpdate,
  validateEventDateTimeAddition,
  validateEventDateTimeUpdate,
  validateEventDateTimeDelete,
  validateOrganizerEventCreation,
  validateOrganizerEventUpdate,
  validateUserForData,
  validateEventCarouselImageDelete,
  validateEventCarouselImageUpload,
  validateEventGalleryImageDelete,
  validateEventGalleryImageUpload,
  validateAddPromoterToEvent,
  validateEventNameSearchKeyword,
  validateAddEventFaq,
  validateEventFaqDelete,
  validateEventFaqUpdate,
  validateEventsReportsData,
} from "../../../validations/index.js";
import getCurrentDateTime from "../../../helpers/getCurrentDateTime.js";
import {
  getStartEndDateTime,
  getFormattedEventDateTimeForTickets,
} from "../../../helpers/DateTime.js";
import { v4 as uuidv4 } from "uuid";
import sendResponse from "../../../helpers/sendResponse.js";
import path from "path";
import fs from "fs";
import {
  ImagesPath,
  EventStatus,
  AdminRoles,
  IsVenueAvailable,
  IsOnlineEvent,
  EventVenueTobeAnnounced,
  EventEnableDisableStatus,
  isTourEvent,
  Status,
} from "../../../helpers/Enum.js";
import { configureMulter } from "../../../helpers/MulterConfig.js";
import {
  validateEventLocationVariables,
  isValidYouTubeUrl,
} from "../../../helpers/commonFunctions.js";
import {
  fetchCategoryDetailsFromDbService,
  findOneCategoryDataService,
} from "../../../services/CategoryServices.js";
import { fetchArtistDetailsFromDbService } from "../../../services/ArtistServices.js";
import { fetchGenreDetailsFromDbService } from "../../../services/GenreServices.js";
import { findOneSuperAdminDataService } from "../../../services/SuperAdminServices.js";
import { findOneEventTourDataService } from "../../../services/EventTourServices.js";
import {
  findOneVenueDataService,
  getVenueDataService,
} from "../../../services/VenueServices.js";
import {
  fetchPromoterDetailsFromDbService,
  findOnePromoterDataService,
} from "../../../services/PromoterServices.js";
import {
  findOneEventDataService,
  getEventDataService,
  updateEventDataService,
  getFormattedEventTableData,
  getFormattedPromoterEventsCardData,
  getFormattedEventDateTimeByIdService,
  getPaginatedEventsData,
  countEvents,
} from "../../../services/EventServices.js";
import {
  fetchOrganizerDetailsFromDbService,
  findOneOrganizerDataService,
} from "../../../services/OrganizerServices.js";
import {
  insertEventDateTimeService,
  insertManyEventDateTimeService,
  getEventDateTimeDataService,
  updateEventDateTimeDataService,
  getEventDateTimeByIdService,
  deleteEventDateTimeByIdService,
  SortEventDateTime,
} from "../../../services/EventDateTimeServices.js";
import {
  createEventCitiesService,
  findOneEventCitiesDataService,
  getEventCitiesDataService,
} from "../../../services/EventCities.js";
import { getAsiaCalcuttaCurrentDateTimeinIsoFormat } from "../../../helpers/DateTime.js";
import { sanitizeFileName } from "../../../helpers/commonFunctions.js";

// ============================================================================
// Helper function: Create event date map that prefers future dates
// ============================================================================
const createEventDateMapWithFuturePreference = (eventDateTimeData, currentDateTime) => {
  const eventDateMap = {};

  eventDateTimeData.forEach((dt) => {
    const dtDate = new Date(dt.EventStartDateTime);
    const isFuture = dtDate.getTime() >= currentDateTime.getTime();

    if (!eventDateMap[dt.Event_id]) {
      eventDateMap[dt.Event_id] = {
        date: dt.EventStartDateTime,
        isFuture: isFuture
      };
    } else {
      const existing = eventDateMap[dt.Event_id];
      const existingDate = new Date(existing.date);

      // Prefer future dates over past dates
      if (isFuture && !existing.isFuture) {
        // New date is future, existing is past → use new
        eventDateMap[dt.Event_id] = {
          date: dt.EventStartDateTime,
          isFuture: isFuture
        };
      } else if (isFuture && existing.isFuture) {
        // Both future → use earlier one
        if (dtDate < existingDate) {
          eventDateMap[dt.Event_id] = {
            date: dt.EventStartDateTime,
            isFuture: isFuture
          };
        }
      } else if (!isFuture && !existing.isFuture) {
        // Both past → use earlier one
        if (dtDate < existingDate) {
          eventDateMap[dt.Event_id] = {
            date: dt.EventStartDateTime,
            isFuture: isFuture
          };
        }
      }
      // else: new is past, existing is future → keep existing
    }
  });

  return eventDateMap;
};

// ============================================================================
const superAdminCreateEvent = async (req, res) => {
  try {
    const fieldsConfig = [
      { name: "CarouselImages", maxCount: 5 },
      { name: "GalleryImages", maxCount: 5 },
      { name: "VenueLayout", maxCount: 1 },
    ];

    const upload = configureMulter(fieldsConfig);

    // Handle file uploads
    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error", err.message);
      }

      // Log API call and request body parameters
      console.log("Create SuperAdmin Event Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      // Validate event creation request
      const validationResponse = await validateSuperAdminEventCreation(
        req.body
      );
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      // Destructure request body
      let {
        TourEvent,
        EventTour_id,
        EventVisibility,
        EventType,
        BookingPhoneNumber,
        WhatsAppPhoneNumber,
        VenueEventFlag,
        venue_id,
        OnlineEventFlag,
        Online_Event_Link,
        VenueToBeAnnounced,
        VenueToBeAnnouncedState,
        VenueToBeAnnouncedStateIsoCode,
        VenueToBeAnnouncedCity,
        VenueToBeAnnouncedCityIsoCode,
        EventOrganizers,
        EventCategories,
        EventArtist,
        EventGenre,
        EventLanguages,
        BestSuitedFor,
        EventName,
        EventDescription,
        FeaturedEventFlag,
        EventTermsCondition,
        EventVedioUrl,
        EventFAQs,
        ConvinienceFeeUnit,
        ConvinienceFeeValue,
        CreatedBy,
        createduser_id,
        Status,
        EventDateTime,
      } = req.body;

      const EventLocationIsValid = validateEventLocationVariables(
        Number(VenueEventFlag),
        Number(OnlineEventFlag),
        Number(VenueToBeAnnounced)
      );

      if (EventLocationIsValid == false) {
        return sendResponse(
          res,
          403,
          true,
          `Location Name Can be Either,Venue/Online/VenueToBeAnnounced`
        );
      }

      const superAdminfilterQuery = {
        _id: createduser_id,
      };

      const superAdminExists = await findOneSuperAdminDataService(
        superAdminfilterQuery
      );

      if (!superAdminExists) {
        return sendResponse(res, 404, true, `SuperAdmin Not Found`);
      }

      // Check if CarouselImages are provided
      if (!req.files || !req.files.CarouselImages) {
        return sendResponse(res, 404, true, `Carousel Image Not Provided`);
      }

      // Check if event name already exists
      const trimmedEventName = EventName.trim();
      const EventNameRegex = new RegExp(`^${trimmedEventName}$`, "i");

      const eventFilterQuery = {
        $and: [
          { EventName: EventNameRegex },
          {
            EventStatus: {
              $nin: [
                EventStatus.Completed,
                EventStatus.Draft,
                EventStatus.ReviewRejected,
              ],
            },
          },
        ],
      };
      const existingEvents = await getEventDataService(eventFilterQuery);

      if (existingEvents.length > 0) {
        return sendResponse(res, 409, true, "Event Name Already Exists");
      }

      // Parse JSON strings from request body
      const parsedEventOrganizers = JSON.parse(EventOrganizers);
      const parsedEventCategories = JSON.parse(EventCategories);
      const parsedEventArtist = JSON.parse(EventArtist);
      const parsedEventGenre = JSON.parse(EventGenre);
      const parsedEventDateTime = JSON.parse(EventDateTime);
      const parsedEventLanguages = JSON.parse(EventLanguages);
      let parsedFaq;
      if (EventFAQs) {
        parsedFaq = JSON.parse(EventFAQs);
      }

      const UpdatedEventDateTime = parsedEventDateTime.map(
        (eventDateTimeObj) => {
          const { EventStartDate, EventStartTime, EventEndDate, EventEndTime } =
            eventDateTimeObj;
          const [EventStartDateTime, EventEndDateTime] = getStartEndDateTime(
            EventStartDate,
            EventStartTime,
            EventEndDate,
            EventEndTime
          );

          return {
            EventStartDateTime: EventStartDateTime,
            EventEndDateTime: EventEndDateTime,
          };
        }
      );

      if (TourEvent == isTourEvent.Yes) {
        if (!EventTour_id) {
          return sendResponse(res, 404, true, `EventTour Id Not Found`);
        }
        const eventTourFilterQuery = {
          _id: EventTour_id,
        };

        const isEventTourExists = await findOneEventTourDataService(
          eventTourFilterQuery
        );

        if (!isEventTourExists) {
          return sendResponse(res, 404, true, `Selected Event Tour Not Found`);
        }
      }

      if (VenueEventFlag == IsVenueAvailable.Yes) {
        if (!venue_id) {
          return sendResponse(res, 404, true, `Venue Not Selected`);
        }
        // Check if venue exists
        const venuefilterQuery = {
          _id: venue_id,
        };

        const isVenueExists = await findOneVenueDataService(venuefilterQuery);

        if (!isVenueExists) {
          return sendResponse(res, 404, true, `Venue Not Found`);
        }
      }

      if (OnlineEventFlag == IsOnlineEvent.Yes) {
        if (!Online_Event_Link) {
          return sendResponse(res, 400, true, `Online Event Link Not Provided`);
        }
      }

      if (VenueToBeAnnounced == EventVenueTobeAnnounced.Yes) {
        if (!VenueToBeAnnouncedState) {
          return sendResponse(
            res,
            400,
            true,
            `Venue To Be Announced State Not Provided`
          );
        }

        if (!VenueToBeAnnouncedStateIsoCode) {
          return sendResponse(
            res,
            400,
            true,
            `Announced Venue State ISO Code Not Provided`
          );
        }

        if (!VenueToBeAnnouncedCity) {
          return sendResponse(
            res,
            400,
            true,
            `Venue To Be Announced City Not Provided`
          );
        }

        if (!VenueToBeAnnouncedCityIsoCode) {
          return sendResponse(
            res,
            400,
            true,
            `Venue To Be Announced City ISO Code Not Provided`
          );
        }

        const EventCityFilterObj = {
          CityName: VenueToBeAnnouncedCity,
        };

        const isEventCityExists = await findOneEventCitiesDataService(
          EventCityFilterObj
        );

        if (!isEventCityExists) {
          const eventCityObj = {
            _id: uuidv4(),
            CityName: VenueToBeAnnouncedCity,
            FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
            createdAt: getCurrentDateTime(),
          };

          await createEventCitiesService(eventCityObj);
        }
      }

      let EventYoutubeVideoUrl;

      if (EventVedioUrl) {
        if (isValidYouTubeUrl(EventVedioUrl)) {
          EventYoutubeVideoUrl = EventVedioUrl;
        } else {
          return sendResponse(
            res,
            409,
            true,
            `Only Youtube Vedio Url is accepted`
          );
        }
      }

      const notFoundOrganizers = await fetchOrganizerDetailsFromDbService(
        parsedEventOrganizers
      );
      if (notFoundOrganizers.length > 0) {
        return sendResponse(res, 404, true, `Selected Organizer(s) Not Found`);
      }

      const notFoundCategories = await fetchCategoryDetailsFromDbService(
        parsedEventCategories
      );
      if (notFoundCategories.length > 0) {
        return sendResponse(res, 404, true, `Selected Categorie(s) Not Found`);
      }

      const notFoundArtists = await fetchArtistDetailsFromDbService(
        parsedEventArtist
      );
      if (notFoundArtists.length > 0) {
        return sendResponse(res, 404, true, `Selected Artist(s) Not Found`);
      }

      const notFoundGenre = await fetchGenreDetailsFromDbService(
        parsedEventGenre
      );
      if (notFoundGenre.length > 0) {
        return sendResponse(res, 404, true, `Selected Genre(s) Not Found`);
      }

      // Generate unique identifier for the event
      const _id = uuidv4();

      // Process and save CarouselImages
      const CarouselImages = req.files.CarouselImages.map((file) => {
        const CarouselImageFolderPath = ImagesPath.EventCarouselImagePath;
        if (!fs.existsSync(CarouselImageFolderPath)) {
          fs.mkdirSync(CarouselImageFolderPath, { recursive: true });
        }
        const updatedfilename = sanitizeFileName(file.originalname);
        const carouselImagePath = `${CarouselImageFolderPath}${Date.now()}-${updatedfilename}`;
        fs.writeFileSync(carouselImagePath, file.buffer);
        return { image_path: carouselImagePath };
      });

      const eventObj = {
        _id,
        TourEvent,
        EventTour_id: EventTour_id ? EventTour_id : null,
        EventCarouselImages: CarouselImages,
        EventVisibility,
        EventType,
        BookingPhoneNumber: BookingPhoneNumber ? BookingPhoneNumber : null,
        WhatsAppPhoneNumber: WhatsAppPhoneNumber ? WhatsAppPhoneNumber : null,
        VenueEventFlag: VenueEventFlag ? VenueEventFlag : null,
        venue_id: venue_id ? venue_id : null,
        OnlineEventFlag: OnlineEventFlag ? OnlineEventFlag : null,
        Online_Event_Link: Online_Event_Link ? Online_Event_Link : null,
        VenueToBeAnnounced: VenueToBeAnnounced ? VenueToBeAnnounced : null,
        VenueToBeAnnouncedState: VenueToBeAnnouncedState
          ? VenueToBeAnnouncedState
          : null,
        VenueToBeAnnouncedStateIsoCode: VenueToBeAnnouncedStateIsoCode
          ? VenueToBeAnnouncedStateIsoCode
          : null,
        VenueToBeAnnouncedCity: VenueToBeAnnouncedCity
          ? VenueToBeAnnouncedCity
          : null,
        VenueToBeAnnouncedCityIsoCode: VenueToBeAnnouncedCityIsoCode
          ? VenueToBeAnnouncedCityIsoCode
          : null,
        EventOrganizers: parsedEventOrganizers,
        EventCategories: parsedEventCategories,
        EventArtist: parsedEventArtist,
        EventGenre: parsedEventGenre,
        EventLanguages: parsedEventLanguages,
        BestSuitedFor: BestSuitedFor ? BestSuitedFor : null,
        ConvinienceFeeUnit,
        ConvinienceFeeValue,
        EventName: trimmedEventName,
        EventDescription,
        FeaturedEventFlag,
        EventTermsCondition,
        EventVedioUrl: EventYoutubeVideoUrl,
        EventFAQs: parsedFaq ? parsedFaq : [],
        CreatedBy,
        createduser_id,
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
        createdAt: getCurrentDateTime(),
        EventStatus: Status,
      };

      // Create new event object
      const newEvent = new Event(eventObj);

      if (req.files && req.files.VenueLayout) {
        const EventVenueLayoutFolderPath = ImagesPath.EventVenueLayoutImagePath;
        if (!fs.existsSync(EventVenueLayoutFolderPath)) {
          fs.mkdirSync(EventVenueLayoutFolderPath, { recursive: true });
        }
        const updatedfilename = sanitizeFileName(
          req.files.VenueLayout[0].originalname
        );
        const EventVenueLayout = `${EventVenueLayoutFolderPath}${Date.now()}-${updatedfilename}`;
        fs.writeFileSync(EventVenueLayout, req.files.VenueLayout[0].buffer);

        newEvent.Venue_layout_ImagePath = EventVenueLayout;
        await newEvent.save();
      } else {
        await newEvent.save();
      }

      if (req.files && req.files.GalleryImages) {
        const GalleryImages = req.files.GalleryImages.map((file) => {
          const EventGalleryImageFolderPath = ImagesPath.EventGalleryImagePath;
          if (!fs.existsSync(EventGalleryImageFolderPath)) {
            fs.mkdirSync(EventGalleryImageFolderPath, { recursive: true });
          }
          const updatedfilename = sanitizeFileName(file.originalname);
          const GalleryImagePath = `${EventGalleryImageFolderPath}${Date.now()}-${updatedfilename}`;
          fs.writeFileSync(GalleryImagePath, file.buffer);
          return { image_path: GalleryImagePath };
        });
        newEvent.EventGalleryImages = GalleryImages;
        await newEvent.save();
      } else {
        await newEvent.save();
      }

      const EventDateTimeData = UpdatedEventDateTime.map(
        (eventDateTimeObject) => {
          const { EventStartDateTime, EventEndDateTime } = eventDateTimeObject;
          return {
            _id: uuidv4(),
            EventStartDateTime,
            EventEndDateTime,
            Event_id: newEvent._id,
          };
        }
      );

      await insertManyEventDateTimeService(EventDateTimeData);

      // Return success response
      return sendResponse(
        res,
        201,
        false,
        "Event Created successfully",
        newEvent
      );
    });
  } catch (error) {
    // Handle errors
    console.error("Create SuperAdmin Event Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const superAdminUpdateEvent = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "VenueLayout", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    // Handle file uploads
    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error", err.message);
      }

      // Log API call and request body parameters
      console.log("SuperAdmin Update Event Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      // Validate event creation request
      const validationResponse = await validateSuperAdminEventUpdate(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      // Destructure request body
      let {
        event_id,
        TourEvent,
        EventTour_id,
        EventVisibility,
        EventType,
        BookingPhoneNumber,
        WhatsAppPhoneNumber,
        VenueEventFlag,
        venue_id,
        OnlineEventFlag,
        Online_Event_Link,
        VenueToBeAnnounced,
        VenueToBeAnnouncedState,
        VenueToBeAnnouncedStateIsoCode,
        VenueToBeAnnouncedCity,
        VenueToBeAnnouncedCityIsoCode,
        EventOrganizers,
        EventCategories,
        EventArtist,
        EventGenre,
        EventFAQs,
        EventLanguages,
        BestSuitedFor,
        EventName,
        EventDescription,
        FeaturedEventFlag,
        EventTermsCondition,
        EventVedioUrl,
        ConvinienceFeeUnit,
        ConvinienceFeeValue,
        Status,
        EventRejectRemark,
      } = req.body;

      const eventFilterQuery = {
        _id: event_id,
      };

      const existingEvent = await Event.findOne(eventFilterQuery);

      if (!existingEvent) {
        return sendResponse(res, 409, true, "Event Not Found");
      }

      const ExistingEventStatus = existingEvent._doc.EventStatus;

      if (TourEvent == isTourEvent.Yes) {
        const eventTourfilterQuery = {
          _id: EventTour_id,
        };

        const isEventTourExists = await findOneEventTourDataService(
          eventTourfilterQuery
        );

        if (!isEventTourExists) {
          return sendResponse(res, 404, true, "Event Tour Not Found");
        }
        existingEvent.EventTour_id = EventTour_id;
      }

      if (EventName) {
        const trimmedEventName = EventName.trim();
        const EventNameRegex = new RegExp(`^${trimmedEventName}$`, "i");

        if (ExistingEventStatus != EventStatus.Published) {
          if (Status == EventStatus.Draft) {
            existingEvent.EventName = trimmedEventName;
          }

          if (Status == EventStatus.ReviewRejected) {
            existingEvent.EventName = trimmedEventName;
          }

          if (Status == EventStatus.Published) {
            const eventFilterQuery = {
              $and: [
                { EventName: EventNameRegex },
                {
                  EventStatus: {
                    $nin: [
                      EventStatus.Completed,
                      EventStatus.Draft,
                      EventStatus.ReviewRejected,
                    ],
                  },
                },
                { _id: { $ne: event_id } },
              ],
            };

            const existingEvents = await getEventDataService(eventFilterQuery);

            if (existingEvents.length > 0) {
              return sendResponse(res, 409, true, "Event Name Already Exists");
            }

            existingEvent.EventName = trimmedEventName;
          }
        }
      }

      if (EventVisibility) {
        existingEvent.EventVisibility = EventVisibility;
      }

      if (EventType) {
        existingEvent.EventType = EventType;
      }

      if (BookingPhoneNumber) {
        existingEvent.BookingPhoneNumber = BookingPhoneNumber;
      }

      if (WhatsAppPhoneNumber) {
        existingEvent.WhatsAppPhoneNumber = WhatsAppPhoneNumber;
      }

      if (VenueEventFlag == IsVenueAvailable.Yes) {
        if (!venue_id) {
          return sendResponse(res, 404, true, "Venue Not Selected");
        }
        try {
          const venuefilterQuery = {
            _id: venue_id,
          };

          const isVenueExists = await findOneVenueDataService(venuefilterQuery);

          if (!isVenueExists) {
            return sendResponse(res, 404, true, "Venue Not Found");
          }

          existingEvent.VenueEventFlag = 1;
          existingEvent.venue_id = venue_id;
          existingEvent.Online_Event_Link = null;
          existingEvent.OnlineEventFlag = 0;
          existingEvent.VenueToBeAnnounced = 0;
          existingEvent.VenueToBeAnnouncedState = null;
          existingEvent.VenueToBeAnnouncedStateIsoCode = null;
          existingEvent.VenueToBeAnnouncedCity = null;
          existingEvent.VenueToBeAnnouncedCityIsoCode = null;
        } catch (err) {
          sendResponse(res, 500, true, "An error occurred");
        }
      }

      if (req.files.VenueLayout) {
        console.log("Venue layout file received:", req.files.VenueLayout);

        const existingEventVenueLayout = existingEvent.Venue_layout_ImagePath;
        const newVenueLayout = req.files.VenueLayout[0];

        // Log the incoming new venue layout file details
        console.log("New venue layout details:", newVenueLayout);

        // Check if the new venue layout file is valid
        if (!newVenueLayout || !newVenueLayout.buffer) {
          console.log("Invalid Venue Layout File");
          return sendResponse(res, 400, true, "Invalid Venue Layout File");
        }

        const VenueLayoutFolderPath = ImagesPath.EventVenueLayoutImagePath;
        const folderPath = VenueLayoutFolderPath.endsWith("/")
          ? VenueLayoutFolderPath
          : `${VenueLayoutFolderPath}/`;

        console.log("Folder path for saving venue layout:", folderPath);

        // Sanitize the filename and create a new path for the venue layout
        const updatedfilename = sanitizeFileName(newVenueLayout.originalname);
        const newVenueImagePath = `${folderPath}${Date.now()}-${updatedfilename}`;

        console.log("New venue layout image path:", newVenueImagePath);

        try {
          // Ensure the directory exists or create it
          if (!fs.existsSync(folderPath)) {
            console.log("Folder does not exist. Creating folder:", folderPath);
            fs.mkdirSync(folderPath, { recursive: true });
          } else {
            console.log("Folder already exists:", folderPath);
          }

          // Write the new venue layout file to the folder
          fs.writeFileSync(newVenueImagePath, newVenueLayout.buffer);
          console.log(
            "New venue layout image saved successfully:",
            newVenueImagePath
          );

          // If there is an existing venue layout image, delete it
          if (
            existingEventVenueLayout &&
            fs.existsSync(existingEventVenueLayout)
          ) {
            console.log(
              "Existing venue layout found, deleting:",
              existingEventVenueLayout
            );
            await fs.promises.unlink(existingEventVenueLayout);
            console.log(
              "Existing venue layout deleted successfully:",
              existingEventVenueLayout
            );
          } else {
            console.log(
              "No existing venue layout found or file does not exist."
            );
          }

          // Update the event with the new venue layout image path
          existingEvent.Venue_layout_ImagePath = newVenueImagePath;
          console.log("Event updated with new venue layout image path.");
        } catch (err) {
          console.error("Error handling venue layout image: ", err);

          // Handle different error cases
          if (err.code == "EACCES") {
            console.log(
              "Permission denied while saving the venue layout image."
            );
            return sendResponse(
              res,
              500,
              true,
              "Permission denied for saving the Venue Layout Image"
            );
          } else if (err.code == "ENOENT") {
            console.log(
              "Directory not found while saving the venue layout image."
            );
            return sendResponse(
              res,
              500,
              true,
              "Directory not found for saving the Venue Layout Image"
            );
          } else {
            console.log(
              "Failed to save the new venue layout image due to unknown error."
            );
            return sendResponse(
              res,
              500,
              true,
              "Failed to save the new Venue Layout Image"
            );
          }
        }
      }

      if (OnlineEventFlag == IsOnlineEvent.Yes) {
        if (!Online_Event_Link) {
          return sendResponse(res, 404, true, "Online Link Not Provided");
        }
        existingEvent.Online_Event_Link = Online_Event_Link;
        existingEvent.OnlineEventFlag = OnlineEventFlag;
        existingEvent.VenueEventFlag = 0;
        existingEvent.Venue_layout_ImagePath = null;
        existingEvent.venue_id = null;
        existingEvent.VenueToBeAnnounced = 0;
        existingEvent.VenueToBeAnnouncedState = null;
        existingEvent.VenueToBeAnnouncedStateIsoCode = null;
        existingEvent.VenueToBeAnnouncedCity = null;
        existingEvent.VenueToBeAnnouncedCityIsoCode = null;
      }

      if (VenueToBeAnnounced == EventVenueTobeAnnounced.Yes) {
        existingEvent.Online_Event_Link = null;
        existingEvent.OnlineEventFlag = 0;
        existingEvent.VenueEventFlag = 0;
        existingEvent.Venue_layout_ImagePath = null;
        existingEvent.venue_id = null;
        existingEvent.VenueToBeAnnounced = VenueToBeAnnounced;
        existingEvent.VenueToBeAnnouncedState = VenueToBeAnnouncedState
          ? VenueToBeAnnouncedState
          : null;
        existingEvent.VenueToBeAnnouncedStateIsoCode =
          VenueToBeAnnouncedStateIsoCode
            ? VenueToBeAnnouncedStateIsoCode
            : null;
        existingEvent.VenueToBeAnnouncedCity = VenueToBeAnnouncedCity
          ? VenueToBeAnnouncedCity
          : null;
        existingEvent.VenueToBeAnnouncedCityIsoCode =
          VenueToBeAnnouncedCityIsoCode ? VenueToBeAnnouncedCityIsoCode : null;

        const EventCityFilterObj = {
          CityName: VenueToBeAnnouncedCity,
        };

        const isEventCityExists = await findOneEventCitiesDataService(
          EventCityFilterObj
        );

        if (!isEventCityExists) {
          const eventCityObj = {
            _id: uuidv4(),
            CityName: VenueToBeAnnouncedCity,
            FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
            createdAt: getCurrentDateTime(),
          };

          await createEventCitiesService(eventCityObj);
        }
      }

      if (EventOrganizers) {
        const parsedEventOrganizers = JSON.parse(EventOrganizers);
        const notFoundOrganizers = await fetchOrganizerDetailsFromDbService(
          parsedEventOrganizers
        );
        if (notFoundOrganizers.length > 0) {
          return sendResponse(
            res,
            404,
            true,
            `Selected Organizer(s) Not Found`
          );
        }
        existingEvent.EventOrganizers = parsedEventOrganizers;
      }

      if (EventCategories) {
        const parsedEventCategories = JSON.parse(EventCategories);
        const notFoundCategories = await fetchCategoryDetailsFromDbService(
          parsedEventCategories
        );
        if (notFoundCategories.length > 0) {
          return sendResponse(
            res,
            404,
            true,
            `Selected Categorie(s) Not Found`
          );
        }
        existingEvent.EventCategories = parsedEventCategories;
      }

      if (EventArtist) {
        const parsedEventArtist = JSON.parse(EventArtist);
        const notFoundArtists = await fetchArtistDetailsFromDbService(
          parsedEventArtist
        );
        if (notFoundArtists.length > 0) {
          return sendResponse(res, 404, true, `Selected Artist(s) Not Found`);
        }
        existingEvent.EventArtist = parsedEventArtist;
      }

      if (EventGenre) {
        const parsedEventGenre = JSON.parse(EventGenre);
        const notFoundGenre = await fetchGenreDetailsFromDbService(
          parsedEventGenre
        );
        if (notFoundGenre.length > 0) {
          return sendResponse(res, 404, true, `Selected Genre(s) Not Found`);
        }
        existingEvent.EventGenre = parsedEventGenre;
      }

      if (EventFAQs) {
        const parsedFaq = JSON.parse(EventFAQs);
        existingEvent.EventFAQs = parsedFaq;
      }

      if (EventLanguages) {
        const parsedEventLanguages = JSON.parse(EventLanguages);
        existingEvent.EventLanguages = parsedEventLanguages;
      }

      if (BestSuitedFor) {
        existingEvent.BestSuitedFor = BestSuitedFor;
      }

      if (EventDescription) {
        existingEvent.EventDescription = EventDescription;
      }

      if (FeaturedEventFlag) {
        existingEvent.FeaturedEventFlag = FeaturedEventFlag;
      }

      if (EventTermsCondition) {
        existingEvent.EventTermsCondition = EventTermsCondition;
      }

      if (EventVedioUrl) {
        if (isValidYouTubeUrl(EventVedioUrl)) {
          existingEvent.EventVedioUrl = EventVedioUrl;
        } else {
          return sendResponse(
            res,
            409,
            true,
            `Only Youtube Vedio Url is accepted`
          );
        }
      }

      if (ConvinienceFeeUnit) {
        existingEvent.ConvinienceFeeUnit = ConvinienceFeeUnit;
      }

      if (ConvinienceFeeValue) {
        existingEvent.ConvinienceFeeValue = ConvinienceFeeValue;
      }

      if (Status == EventStatus.ReviewRejected) {
        if (!EventRejectRemark) {
          return sendResponse(res, 409, true, "Event Reject Mark Not Found");
        }
        existingEvent.EventRejectRemark = EventRejectRemark;
        existingEvent.EventStatus = Status;
      } else {
        existingEvent.EventStatus = Status;
      }

      await existingEvent.save();

      // Return success response
      return sendResponse(res, 201, false, "Event Updated successfully");
    });
  } catch (error) {
    // Handle errors
    console.error("SuperAdmin Update Event Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteEventCarouselImage = async (req, res) => {
  try {
    const validationResponse = await validateEventCarouselImageDelete(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { event_id, image_id } = req.body;

    console.log("Delete Event Carousel Image Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const eventFilterQuery = {
      _id: event_id,
    };
    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const EventCarouselImages = isEventExists.EventCarouselImages;

    const ImagesFoundwithId = EventCarouselImages.filter((data) => {
      return data._id == image_id;
    });

    if (ImagesFoundwithId.length == 0) {
      return sendResponse(res, 404, true, "Event Image not found");
    }

    const ToBeRemovedImageData = ImagesFoundwithId[0]._doc;

    await fs.promises.unlink(path.join(ToBeRemovedImageData.image_path));

    const UpdatedImagesAfterDeletion = EventCarouselImages.filter((data) => {
      return data._id != image_id;
    });

    const updateEventQuery = {
      EventCarouselImages: UpdatedImagesAfterDeletion,
    };

    await updateEventDataService(eventFilterQuery, updateEventQuery);
    return sendResponse(
      res,
      200,
      false,
      "Event Carousel  Image Deleted Successfully"
    );
  } catch (error) {
    console.error("Delete Event Carousel Image Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const uploadEventCarouselImage = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "CarouselImages", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error");
      }

      const validationResponse = await validateEventCarouselImageUpload(
        req.body
      );
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { event_id } = req.body;

      console.log("Upload Event Carousel Image Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      if (!req.files.CarouselImages) {
        return sendResponse(
          res,
          404,
          true,
          "Event Carousel Image not Provided"
        );
      }

      const eventFilterQuery = {
        _id: event_id,
      };

      let isEventExists = await findOneEventDataService(eventFilterQuery);

      if (!isEventExists) {
        return sendResponse(res, 404, true, "Event Not Found!!");
      }

      const EventPreviousCarouselImageArray = isEventExists.EventCarouselImages;

      const SingleEventCarouselImage = req.files.CarouselImages[0];

      const EventCarouselImagePath = ImagesPath.EventCarouselImagePath;
      if (!fs.existsSync(EventCarouselImagePath)) {
        fs.mkdirSync(EventCarouselImagePath, { recursive: true });
      }
      const updatedfilename = sanitizeFileName(
        SingleEventCarouselImage.originalname
      );
      const CarouselImagePath = `${EventCarouselImagePath}${Date.now()}-${updatedfilename}`;
      fs.writeFileSync(CarouselImagePath, SingleEventCarouselImage.buffer);

      const NewImagePathObject = {
        image_path: CarouselImagePath,
        _id: uuidv4(),
      };

      EventPreviousCarouselImageArray.push(NewImagePathObject);

      const eventUpdateQuery = {
        EventCarouselImages: EventPreviousCarouselImageArray,
      };

      await updateEventDataService(eventFilterQuery, eventUpdateQuery);

      let updatedEventData = await findOneEventDataService(eventFilterQuery);

      const UpdatedEventCarouselImageArray =
        updatedEventData.EventCarouselImages;

      return sendResponse(
        res,
        201,
        false,
        "Event Carousel Image Uploaded successfully",
        UpdatedEventCarouselImageArray
      );
    });
  } catch (error) {
    console.error("Upload Event Carousel Images Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteEventGalleryImage = async (req, res) => {
  try {
    const validationResponse = await validateEventGalleryImageDelete(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { event_id, image_id } = req.body;

    console.log("Delete Event Gallery Image Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const eventFilterQuery = {
      _id: event_id,
    };
    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const EventGalleryImages = isEventExists.EventGalleryImages;

    const ImagesFoundwithId = EventGalleryImages.filter((data) => {
      return data._id == image_id;
    });

    if (ImagesFoundwithId.length == 0) {
      return sendResponse(res, 404, true, "Event Gallery Image not found");
    }

    const ToBeRemovedImageData = ImagesFoundwithId[0];

    await fs.promises.unlink(path.join(ToBeRemovedImageData.image_path));

    const UpdatedImagesAfterDeletion = EventGalleryImages.filter((data) => {
      return data._id != image_id;
    });

    const eventUpdateQuery = {
      EventGalleryImages: UpdatedImagesAfterDeletion,
    };
    await updateEventDataService(eventFilterQuery, eventUpdateQuery);
    return sendResponse(
      res,
      200,
      false,
      "Event Gallery Image Deleted Successfully"
    );
  } catch (error) {
    console.error("Delete Event Gallery Image Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const uploadEventGalleryImage = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "GalleryImage", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error");
      }

      const validationResponse = await validateEventGalleryImageUpload(
        req.body
      );
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      const { event_id } = req.body;

      console.log("Upload Event Gallery Image Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      if (!req.files.GalleryImage) {
        return sendResponse(res, 404, true, "Event Gallery Image not Provided");
      }

      const eventFilterQuery = {
        _id: event_id,
      };
      let isEventExists = await findOneEventDataService(eventFilterQuery);

      if (!isEventExists) {
        return sendResponse(res, 404, true, "Event Not Found!!");
      }

      const EventPreviousGalleryImageArray = isEventExists.EventGalleryImages;

      const SingleEventGalleryImage = req.files.GalleryImage[0];

      const EventGalleryImagePath = ImagesPath.EventGalleryImagePath;
      if (!fs.existsSync(EventGalleryImagePath)) {
        fs.mkdirSync(EventGalleryImagePath, { recursive: true });
      }
      const updatedfilename = sanitizeFileName(
        SingleEventGalleryImage.originalname
      );

      const CarouselImagePath = `${EventGalleryImagePath}${Date.now()}-${updatedfilename}`;
      fs.writeFileSync(CarouselImagePath, SingleEventGalleryImage.buffer);

      const NewImagePathObject = {
        image_path: CarouselImagePath,
        _id: uuidv4(),
      };

      EventPreviousGalleryImageArray.push(NewImagePathObject);

      const eventUpdateQuery = {
        EventGalleryImages: EventPreviousGalleryImageArray,
      };
      await updateEventDataService(eventFilterQuery, eventUpdateQuery);

      let updatedEventData = await findOneEventDataService(eventFilterQuery);

      const updatedEventGalleryImages = updatedEventData.EventGalleryImages;

      return sendResponse(
        res,
        201,
        false,
        "Event Gallery Image Uploaded successfully",
        updatedEventGalleryImages
      );
    });
  } catch (error) {
    console.error("Upload Event Gallery Images Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const addNewEventDateTimeInEvent = async (req, res) => {
  try {
    console.log("Add New Event Date Time Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventDateTimeAddition(req.body);

    const {
      event_id,
      EventStartDate,
      EventStartTime,
      EventEndDate,
      EventEndTime,
    } = req.body;

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const eventFilterQuery = {
      _id: event_id,
    };

    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const ExistingEventStatus = isEventExists._doc.EventStatus;

    if (ExistingEventStatus == EventStatus.Published) {
      return sendResponse(
        res,
        409,
        true,
        "Event Date Time Cannot be Added if Status is Published"
      );
    }

    const [EventStartDateTime, EventEndDateTime] = getStartEndDateTime(
      EventStartDate,
      EventStartTime,
      EventEndDate,
      EventEndTime
    );

    const EventDateTimeObj = {
      _id: uuidv4(),
      EventStartDateTime,
      EventEndDateTime,
      Event_id: event_id,
    };

    await insertEventDateTimeService(EventDateTimeObj);

    return sendResponse(
      res,
      201,
      false,
      "Event Date Time inserted successfully",
      EventDateTimeObj
    );
  } catch (error) {
    console.error("Add New Event Date Time Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateEventDateTime = async (req, res) => {
  try {
    console.log("Update Event Date Time Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventDateTimeUpdate(req.body);

    const {
      event_id,
      eventDateTime_Id,
      EventStartDate,
      EventStartTime,
      EventEndDate,
      EventEndTime,
    } = req.body;

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const eventFilterQuery = {
      _id: event_id,
    };

    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const eventDateTimeForEventsFilterQuery = {
      Event_id: event_id,
    };

    let allEventDateTimes = await getEventDateTimeDataService(
      eventDateTimeForEventsFilterQuery
    );

    const eventDateTimeIds = new Set(allEventDateTimes.map((data) => data._id));

    const EventDateTimeExists = eventDateTimeIds.has(eventDateTime_Id);

    if (!EventDateTimeExists) {
      return sendResponse(res, 404, true, `Event Date Time Not Found`);
    }

    const [EventStartDateTime, EventEndDateTime] = getStartEndDateTime(
      EventStartDate,
      EventStartTime,
      EventEndDate,
      EventEndTime
    );

    const eventDateTimeUpdateQuery = {
      EventStartDateTime: EventStartDateTime,
      EventEndDateTime: EventEndDateTime,
    };

    const eventDateTimeFilterQuery = {
      _id: eventDateTime_Id,
    };

    await updateEventDateTimeDataService(
      eventDateTimeFilterQuery,
      eventDateTimeUpdateQuery
    );

    const updateEventDateTime = await getEventDateTimeByIdService(
      eventDateTime_Id
    );

    // const FormattedDateTime = getFormattedEventDateTimeForTickets(data);
    return sendResponse(
      res,
      200,
      false,
      "Event Date Time updated successfully",
      updateEventDateTime
    );
  } catch (error) {
    console.error("Update Event Date Time Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteEventDateTime = async (req, res) => {
  try {
    console.log("Delete Event Date Time Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventDateTimeDelete(req.body);

    const { event_id, eventDateTime_Id } = req.body;

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const eventFilterQuery = {
      _id: event_id,
    };

    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const ExistingEventStatus = isEventExists._doc.EventStatus;

    if (ExistingEventStatus == EventStatus.Published) {
      return sendResponse(
        res,
        409,
        true,
        "Event Date Time Cannot be Deleted if Status is Published"
      );
    }

    const eventDateTimeForEventsFilterQuery = {
      Event_id: event_id,
    };

    let allEventDateTimes = await getEventDateTimeDataService(
      eventDateTimeForEventsFilterQuery
    );

    const EventDateTimeDataLength = allEventDateTimes.length;

    if (EventDateTimeDataLength <= 1) {
      return sendResponse(
        res,
        409,
        true,
        "One Event Date Time is required in Event"
      );
    }
    const eventDateTimeIds = new Set(allEventDateTimes.map((data) => data._id));

    const EventDateTimeExists = eventDateTimeIds.has(eventDateTime_Id);

    if (!EventDateTimeExists) {
      return sendResponse(res, 404, true, `Event Date Time Not Found`);
    }

    const deleteQuery = {
      _id: eventDateTime_Id,
    };

    await deleteEventDateTimeByIdService(deleteQuery);

    return sendResponse(
      res,
      200,
      false,
      "Event Date Time Deleted successfully"
    );
  } catch (error) {
    console.error("Delete Event Date Time Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const addEventFaq = async (req, res) => {
  try {
    console.log("Add Event Faq in Event Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateAddEventFaq(req.body);

    const { event_id, Question, Answer } = req.body;

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const eventFilterQuery = {
      _id: event_id,
    };

    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const FaqObj = {
      Question: Question,
      Answer: Answer,
    };

    isEventExists._doc.EventFAQs.push(FaqObj);

    await isEventExists.save();

    let updatedEventData = await findOneEventDataService(eventFilterQuery);
    const FaqData = updatedEventData._doc.EventFAQs;

    return sendResponse(res, 200, false, "Faq Created successfully", FaqData);
  } catch (error) {
    console.error("Add Faq Event Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const deleteEventFaq = async (req, res) => {
  try {
    console.log("Delete Event Faq Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventFaqDelete(req.body);

    const { event_id, eventFaq_Id } = req.body;

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const eventFilterQuery = {
      _id: event_id,
    };

    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const faqIndex = isEventExists.EventFAQs.findIndex(
      (faq) => faq._id.toString() == eventFaq_Id
    );

    if (faqIndex == -1) {
      console.log("FAQ not found");
      return sendResponse(res, 404, false, "Event Faq Not Found");
    }

    isEventExists.EventFAQs.splice(faqIndex, 1);

    await isEventExists.save();

    return sendResponse(res, 200, false, "Event Faq Deleted Successfully");
  } catch (error) {
    console.error("Delete Event Faq Data Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const updateEventFaq = async (req, res) => {
  try {
    console.log("Update Event Faq Data Api Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventFaqUpdate(req.body);

    const { event_id, eventFaq_Id, Question, Answer } = req.body;

    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const eventFilterQuery = {
      _id: event_id,
    };

    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const faq = isEventExists.EventFAQs.id(eventFaq_Id);
    if (!faq) {
      return sendResponse(res, 404, false, "Event Faq Not Found");
    }

    faq.Question = Question || faq.Question;
    faq.Answer = Answer || faq.Answer;

    await isEventExists.save();

    const updatedFaqData = isEventExists.EventFAQs.id(eventFaq_Id);

    return sendResponse(
      res,
      200,
      false,
      "Event Faq updated successfully",
      updatedFaqData
    );
  } catch (error) {
    console.error("Update in Event Faq Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const organizerCreateEvent = async (req, res) => {
  try {
    const fieldsConfig = [
      { name: "CarouselImages", maxCount: 5 },
      { name: "GalleryImages", maxCount: 5 },
      { name: "VenueLayout", maxCount: 1 },
    ];

    const upload = configureMulter(fieldsConfig);

    // Handle file uploads
    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error", err.message);
      }

      // Log API call and request body parameters
      console.log("Create Organizer Event Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      // Validate event creation request
      const validationResponse = await validateOrganizerEventCreation(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      // Destructure request body
      let {
        TourEvent,
        EventTour_id,
        EventVisibility,
        EventType,
        VenueEventFlag,
        venue_id,
        OnlineEventFlag,
        Online_Event_Link,
        VenueToBeAnnounced,
        VenueToBeAnnouncedState,
        VenueToBeAnnouncedStateIsoCode,
        VenueToBeAnnouncedCity,
        VenueToBeAnnouncedCityIsoCode,
        EventCategories,
        EventArtist,
        EventGenre,
        EventLanguages,
        BestSuitedFor,
        EventName,
        EventDescription,
        EventTermsCondition,
        EventVedioUrl,
        EventFAQs,
        CreatedBy,
        createduser_id,
        Status,
        EventDateTime,
      } = req.body;

      const EventLocationIsValid = validateEventLocationVariables(
        Number(VenueEventFlag),
        Number(OnlineEventFlag),
        Number(VenueToBeAnnounced)
      );

      if (EventLocationIsValid == false) {
        return sendResponse(
          res,
          403,
          true,
          `Location Name Can be Either,Venue/Online/VenueToBeAnnounced`
        );
      }

      const organizerFilterQuery = {
        _id: createduser_id,
      };
      const organizerExists = await findOneOrganizerDataService(
        organizerFilterQuery
      );

      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }

      // Check if CarouselImages are provided
      if (!req.files || !req.files.CarouselImages) {
        return sendResponse(res, 404, true, `Carousel Image Not Provided`);
      }

      // Check if event name already exists
      const trimmedEventName = EventName.trim();
      const EventNameRegex = new RegExp(`^${trimmedEventName}$`, "i");

      const eventFilterQuery = {
        $and: [
          { EventName: EventNameRegex },
          {
            EventStatus: {
              $nin: [
                EventStatus.Completed,
                EventStatus.Draft,
                EventStatus.ReviewRejected,
              ],
            },
          },
        ],
      };
      const existingEvents = await getEventDataService(eventFilterQuery);

      if (existingEvents.length > 0) {
        return sendResponse(res, 409, true, "Event Name Already Exists");
      }

      // Parse JSON strings from request body
      const parsedEventCategories = JSON.parse(EventCategories);
      const parsedEventArtist = JSON.parse(EventArtist);
      const parsedEventGenre = JSON.parse(EventGenre);
      const parsedEventDateTime = JSON.parse(EventDateTime);
      const parsedEventLanguages = JSON.parse(EventLanguages);
      let parsedFaq;
      if (EventFAQs) {
        parsedFaq = JSON.parse(EventFAQs);
      }

      const UpdatedEventDateTime = parsedEventDateTime.map(
        (eventDateTimeObj) => {
          const { EventStartDate, EventStartTime, EventEndDate, EventEndTime } =
            eventDateTimeObj;
          const [EventStartDateTime, EventEndDateTime] = getStartEndDateTime(
            EventStartDate,
            EventStartTime,
            EventEndDate,
            EventEndTime
          );

          return {
            EventStartDateTime: EventStartDateTime,
            EventEndDateTime: EventEndDateTime,
          };
        }
      );

      if (TourEvent == isTourEvent.Yes) {
        if (!EventTour_id) {
          return sendResponse(res, 404, true, `EventTour Id Not Found`);
        }
        const eventTourFilterQuery = {
          _id: EventTour_id,
        };

        const isEventTourExists = await findOneEventTourDataService(
          eventTourFilterQuery
        );

        if (!isEventTourExists) {
          return sendResponse(res, 404, true, `Selected Event Tour Not Found`);
        }
      }

      if (VenueEventFlag == IsVenueAvailable.Yes) {
        if (!venue_id) {
          return sendResponse(res, 404, true, `Venue Not Selected`);
        }
        // Check if venue exists
        const venuefilterQuery = {
          _id: venue_id,
        };

        const isVenueExists = await findOneVenueDataService(venuefilterQuery);

        if (!isVenueExists) {
          return sendResponse(res, 404, true, `Venue Not Found`);
        }
      }

      if (OnlineEventFlag == IsOnlineEvent.Yes) {
        if (!Online_Event_Link) {
          return sendResponse(res, 400, true, `Online Event Link Not Provided`);
        }
      }

      if (VenueToBeAnnounced == EventVenueTobeAnnounced.Yes) {
        if (!VenueToBeAnnouncedState) {
          return sendResponse(
            res,
            400,
            true,
            `Venue To Be Announced State Not Provided`
          );
        }

        if (!VenueToBeAnnouncedStateIsoCode) {
          return sendResponse(
            res,
            400,
            true,
            `Announced Venue State ISO Code Not Provided`
          );
        }

        if (!VenueToBeAnnouncedCity) {
          return sendResponse(
            res,
            400,
            true,
            `Venue To Be Announced City Not Provided`
          );
        }

        if (!VenueToBeAnnouncedCityIsoCode) {
          return sendResponse(
            res,
            400,
            true,
            `Venue To Be Announced City ISO Code Not Provided`
          );
        }

        const EventCityFilterObj = {
          CityName: VenueToBeAnnouncedCity,
        };

        const isEventCityExists = await findOneEventCitiesDataService(
          EventCityFilterObj
        );

        if (!isEventCityExists) {
          const eventCityObj = {
            _id: uuidv4(),
            CityName: VenueToBeAnnouncedCity,
            FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
            createdAt: getCurrentDateTime(),
          };

          await createEventCitiesService(eventCityObj);
        }
      }

      const notFoundCategories = await fetchCategoryDetailsFromDbService(
        parsedEventCategories
      );
      if (notFoundCategories.length > 0) {
        return sendResponse(res, 404, true, `Selected Categorie(s) Not Found`);
      }

      const notFoundArtists = await fetchArtistDetailsFromDbService(
        parsedEventArtist
      );
      if (notFoundArtists.length > 0) {
        return sendResponse(res, 404, true, `Selected Artist(s) Not Found`);
      }

      const notFoundGenre = await fetchGenreDetailsFromDbService(
        parsedEventGenre
      );
      if (notFoundGenre.length > 0) {
        return sendResponse(res, 404, true, `Selected Genre(s) Not Found`);
      }

      let EventYoutubeVideoUrl;

      if (EventVedioUrl) {
        if (isValidYouTubeUrl(EventVedioUrl)) {
          EventYoutubeVideoUrl = EventVedioUrl;
        } else {
          return sendResponse(
            res,
            409,
            true,
            `Only Youtube Vedio Url is accepted`
          );
        }
      }

      // Generate unique identifier for the event
      const _id = uuidv4();

      // Process and save CarouselImages
      const CarouselImages = req.files.CarouselImages.map((file) => {
        const CarouselImageFolderPath = ImagesPath.EventCarouselImagePath;
        if (!fs.existsSync(CarouselImageFolderPath)) {
          fs.mkdirSync(CarouselImageFolderPath, { recursive: true });
        }
        const updatedfilename = sanitizeFileName(file.originalname);

        const carouselImagePath = `${CarouselImageFolderPath}${Date.now()}-${updatedfilename}`;
        fs.writeFileSync(carouselImagePath, file.buffer);
        return { image_path: carouselImagePath };
      });

      const organizerArray = [
        {
          organizer_id: createduser_id,
        },
      ];

      // Create new event object
      const eventObj = {
        _id,
        TourEvent,
        EventTour_id: EventTour_id ? EventTour_id : null,
        EventCarouselImages: CarouselImages,
        EventVisibility,
        EventType,
        VenueEventFlag: VenueEventFlag ? VenueEventFlag : null,
        venue_id: venue_id ? venue_id : null,
        OnlineEventFlag: OnlineEventFlag ? OnlineEventFlag : null,
        Online_Event_Link: Online_Event_Link ? Online_Event_Link : null,
        VenueToBeAnnounced: VenueToBeAnnounced ? VenueToBeAnnounced : null,
        VenueToBeAnnouncedState: VenueToBeAnnouncedState
          ? VenueToBeAnnouncedState
          : null,
        VenueToBeAnnouncedStateIsoCode: VenueToBeAnnouncedStateIsoCode
          ? VenueToBeAnnouncedStateIsoCode
          : null,
        VenueToBeAnnouncedCity: VenueToBeAnnouncedCity
          ? VenueToBeAnnouncedCity
          : null,
        VenueToBeAnnouncedCityIsoCode: VenueToBeAnnouncedCityIsoCode
          ? VenueToBeAnnouncedCityIsoCode
          : null,
        EventCategories: parsedEventCategories,
        EventArtist: parsedEventArtist,
        EventGenre: parsedEventGenre,
        EventLanguages: parsedEventLanguages,
        EventOrganizers: organizerArray,
        BestSuitedFor: BestSuitedFor ? BestSuitedFor : null,
        EventName: trimmedEventName,
        EventDescription,
        EventTermsCondition,
        EventVedioUrl: EventYoutubeVideoUrl,
        EventFAQs: parsedFaq ? parsedFaq : [],
        CreatedBy,
        createduser_id,
        FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
        createdAt: getCurrentDateTime(),
        EventStatus: Status,
      };

      const newEvent = new Event(eventObj);

      if (req.files && req.files.VenueLayout) {
        const EventVenueLayoutFolderPath = ImagesPath.EventVenueLayoutImagePath;
        if (!fs.existsSync(EventVenueLayoutFolderPath)) {
          fs.mkdirSync(EventVenueLayoutFolderPath, { recursive: true });
        }
        const updatedfilename = sanitizeFileName(
          req.files.VenueLayout[0].originalname
        );

        const EventVenueLayout = `${EventVenueLayoutFolderPath}${Date.now()}-${updatedfilename}`;
        fs.writeFileSync(EventVenueLayout, req.files.VenueLayout[0].buffer);

        newEvent.Venue_layout_ImagePath = EventVenueLayout;
        await newEvent.save();
      } else {
        await newEvent.save();
      }

      if (req.files && req.files.GalleryImages) {
        const GalleryImages = req.files.GalleryImages.map((file) => {
          const EventGalleryImageFolderPath = ImagesPath.EventGalleryImagePath;
          if (!fs.existsSync(EventGalleryImageFolderPath)) {
            fs.mkdirSync(EventGalleryImageFolderPath, { recursive: true });
          }
          const updatedfilename = sanitizeFileName(file.originalname);

          const GalleryImagePath = `${EventGalleryImageFolderPath}${Date.now()}-${updatedfilename}`;
          fs.writeFileSync(GalleryImagePath, file.buffer);
          return { image_path: GalleryImagePath };
        });
        newEvent.EventGalleryImages = GalleryImages;
        await newEvent.save();
      } else {
        await newEvent.save();
      }

      const EventDateTimeData = UpdatedEventDateTime.map(
        (eventDateTimeObject) => {
          const { EventStartDateTime, EventEndDateTime } = eventDateTimeObject;
          return {
            _id: uuidv4(),
            EventStartDateTime,
            EventEndDateTime,
            Event_id: newEvent._id,
          };
        }
      );

      await insertManyEventDateTimeService(EventDateTimeData);

      // Return success response
      return sendResponse(
        res,
        201,
        false,
        "Event Created successfully",
        newEvent
      );
    });
  } catch (error) {
    // Handle errors
    console.error("Create Organizer Event Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const organizerUpdateEvent = async (req, res) => {
  try {
    const fieldsConfig = [{ name: "VenueLayout", maxCount: 1 }];

    const upload = configureMulter(fieldsConfig);

    // Handle file uploads
    upload(req, res, async function (err) {
      if (err) {
        console.error("Multer Error:", err.message);
        return sendResponse(res, 500, true, "Multer Error", err.message);
      }

      // Log API call and request body parameters
      console.log("Organizer Update Event Api Called");
      console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

      // Validate event creation request
      const validationResponse = await validateOrganizerEventUpdate(req.body);
      if (validationResponse.error) {
        return sendResponse(res, 400, true, validationResponse.errorMessage);
      }

      // Destructure request body
      let {
        event_id,
        EventVisibility,
        BookingPhoneNumber,
        VenueEventFlag,
        venue_id,
        OnlineEventFlag,
        Online_Event_Link,
        VenueToBeAnnounced,
        VenueToBeAnnouncedState,
        VenueToBeAnnouncedStateIsoCode,
        VenueToBeAnnouncedCity,
        VenueToBeAnnouncedCityIsoCode,
        EventCategories,
        EventArtist,
        EventGenre,
        EventLanguages,
        BestSuitedFor,
        EventName,
        EventTag_id,
        EventTour_id,
        EventDescription,
        EventTermsCondition,
        EventVedioUrl,
        EventFAQs,
        Status,
      } = req.body;

      const eventFilterQuery = {
        _id: event_id,
      };

      const existingEvent = await Event.findOne(eventFilterQuery);

      if (!existingEvent) {
        return sendResponse(res, 409, true, "Event Not Found");
      }

      const existingEventStatus = existingEvent._doc.EventStatus;

      if (
        existingEventStatus == EventStatus.Published ||
        existingEventStatus == EventStatus.ReviewApproved
      ) {
        return sendResponse(
          res,
          409,
          true,
          "Published or ReviewApproved Event Cannot be Updated"
        );
      }

      if (Status == EventStatus.Draft || Status == EventStatus.InReview) {
        if (EventVisibility) {
          existingEvent.EventVisibility = EventVisibility;
        }

        if (BookingPhoneNumber) {
          existingEvent.BookingPhoneNumber = BookingPhoneNumber;
        }

        if (VenueEventFlag == IsVenueAvailable.Yes) {
          if (!venue_id) {
            return sendResponse(res, 404, true, "Venue Not Selected");
          }
          try {
            const venuefilterQuery = {
              _id: venue_id,
            };

            const isVenueExists = await findOneVenueDataService(
              venuefilterQuery
            );

            if (!isVenueExists) {
              return sendResponse(res, 404, true, "Venue Not Found");
            }

            existingEvent.VenueEventFlag = 1;
            existingEvent.venue_id = venue_id;
            existingEvent.Online_Event_Link = null;
            existingEvent.OnlineEventFlag = 0;
            existingEvent.VenueToBeAnnounced = 0;
            existingEvent.VenueToBeAnnouncedState = null;
            existingEvent.VenueToBeAnnouncedStateIsoCode = null;
            existingEvent.VenueToBeAnnouncedCity = null;
            existingEvent.VenueToBeAnnouncedCityIsoCode = null;
          } catch (err) {
            sendResponse(res, 500, true, "An error occurred");
          }
          existingEvent.OnlineEventFlag = 0;
          existingEvent.VenueToBeAnnounced = 0;
        }

        if (req.files.VenueLayout) {
          console.log("Venue layout file received:", req.files.VenueLayout);

          const existingEventVenueLayout = existingEvent.Venue_layout_ImagePath;
          const newVenueLayout = req.files.VenueLayout[0];

          // Log the incoming new venue layout file details
          console.log("New venue layout details:", newVenueLayout);

          // Check if the new venue layout file is valid
          if (!newVenueLayout || !newVenueLayout.buffer) {
            console.log("Invalid Venue Layout File");
            return sendResponse(res, 400, true, "Invalid Venue Layout File");
          }

          const VenueLayoutFolderPath = ImagesPath.EventVenueLayoutImagePath;
          const folderPath = VenueLayoutFolderPath.endsWith("/")
            ? VenueLayoutFolderPath
            : `${VenueLayoutFolderPath}/`;

          console.log("Folder path for saving venue layout:", folderPath);

          // Sanitize the filename and create a new path for the venue layout
          const updatedfilename = sanitizeFileName(newVenueLayout.originalname);
          const newVenueImagePath = `${folderPath}${Date.now()}-${updatedfilename}`;

          console.log("New venue layout image path:", newVenueImagePath);

          try {
            // Ensure the directory exists or create it
            if (!fs.existsSync(folderPath)) {
              console.log(
                "Folder does not exist. Creating folder:",
                folderPath
              );
              fs.mkdirSync(folderPath, { recursive: true });
            } else {
              console.log("Folder already exists:", folderPath);
            }

            // Write the new venue layout file to the folder
            fs.writeFileSync(newVenueImagePath, newVenueLayout.buffer);
            console.log(
              "New venue layout image saved successfully:",
              newVenueImagePath
            );

            // If there is an existing venue layout image, delete it
            if (
              existingEventVenueLayout &&
              fs.existsSync(existingEventVenueLayout)
            ) {
              console.log(
                "Existing venue layout found, deleting:",
                existingEventVenueLayout
              );
              await fs.promises.unlink(existingEventVenueLayout);
              console.log(
                "Existing venue layout deleted successfully:",
                existingEventVenueLayout
              );
            } else {
              console.log(
                "No existing venue layout found or file does not exist."
              );
            }

            // Update the event with the new venue layout image path
            existingEvent.Venue_layout_ImagePath = newVenueImagePath;
            console.log("Event updated with new venue layout image path.");
          } catch (err) {
            console.error("Error handling venue layout image: ", err);

            // Handle different error cases
            if (err.code == "EACCES") {
              console.log(
                "Permission denied while saving the venue layout image."
              );
              return sendResponse(
                res,
                500,
                true,
                "Permission denied for saving the Venue Layout Image"
              );
            } else if (err.code == "ENOENT") {
              console.log(
                "Directory not found while saving the venue layout image."
              );
              return sendResponse(
                res,
                500,
                true,
                "Directory not found for saving the Venue Layout Image"
              );
            } else {
              console.log(
                "Failed to save the new venue layout image due to unknown error."
              );
              return sendResponse(
                res,
                500,
                true,
                "Failed to save the new Venue Layout Image"
              );
            }
          }
        }

        if (OnlineEventFlag == IsOnlineEvent.Yes) {
          if (!Online_Event_Link) {
            return sendResponse(res, 404, true, "Online Link Not Provided");
          }

          existingEvent.Online_Event_Link = Online_Event_Link;
          existingEvent.OnlineEventFlag = OnlineEventFlag;
          existingEvent.VenueEventFlag = 0;
          existingEvent.Venue_layout_ImagePath = null;
          existingEvent.venue_id = null;
          existingEvent.VenueToBeAnnounced = 0;
          existingEvent.VenueToBeAnnouncedState = null;
          existingEvent.VenueToBeAnnouncedStateIsoCode = null;
          existingEvent.VenueToBeAnnouncedCity = null;
          existingEvent.VenueToBeAnnouncedCityIsoCode = null;
        }

        if (VenueToBeAnnounced == EventVenueTobeAnnounced.Yes) {
          existingEvent.Online_Event_Link = null;
          existingEvent.OnlineEventFlag = 0;
          existingEvent.VenueEventFlag = 0;
          existingEvent.Venue_layout_ImagePath = null;
          existingEvent.venue_id = null;
          existingEvent.VenueToBeAnnounced = VenueToBeAnnounced;
          existingEvent.VenueToBeAnnouncedState = VenueToBeAnnouncedState
            ? VenueToBeAnnouncedState
            : null;
          existingEvent.VenueToBeAnnouncedStateIsoCode =
            VenueToBeAnnouncedStateIsoCode
              ? VenueToBeAnnouncedStateIsoCode
              : null;
          existingEvent.VenueToBeAnnouncedCity = VenueToBeAnnouncedCity
            ? VenueToBeAnnouncedCity
            : null;
          existingEvent.VenueToBeAnnouncedCityIsoCode =
            VenueToBeAnnouncedCityIsoCode
              ? VenueToBeAnnouncedCityIsoCode
              : null;

          const EventCityFilterObj = {
            CityName: VenueToBeAnnouncedCity,
          };

          const isEventCityExists = await findOneEventCitiesDataService(
            EventCityFilterObj
          );

          if (!isEventCityExists) {
            const eventCityObj = {
              _id: uuidv4(),
              CityName: VenueToBeAnnouncedCity,
              FilterationDateTime: getAsiaCalcuttaCurrentDateTimeinIsoFormat(),
              createdAt: getCurrentDateTime(),
            };

            await createEventCitiesService(eventCityObj);
          }
        }

        if (EventCategories) {
          const parsedEventCategories = JSON.parse(EventCategories);
          const notFoundCategories = await fetchCategoryDetailsFromDbService(
            parsedEventCategories
          );
          if (notFoundCategories.length > 0) {
            return sendResponse(
              res,
              404,
              true,
              `Selected Categorie(s) Not Found`
            );
          }
          existingEvent.EventCategories = parsedEventCategories;
        }

        if (EventArtist) {
          const parsedEventArtist = JSON.parse(EventArtist);
          const notFoundArtists = await fetchArtistDetailsFromDbService(
            parsedEventArtist
          );
          if (notFoundArtists.length > 0) {
            return sendResponse(res, 404, true, `Selected Artist(s) Not Found`);
          }
          existingEvent.EventArtist = parsedEventArtist;
        }

        if (EventGenre) {
          const parsedEventGenre = JSON.parse(EventGenre);
          const notFoundGenre = await fetchGenreDetailsFromDbService(
            parsedEventGenre
          );
          if (notFoundGenre.length > 0) {
            return sendResponse(res, 404, true, `Selected Genre(s) Not Found`);
          }
          existingEvent.EventGenre = parsedEventGenre;
        }

        if (EventFAQs) {
          const parsedFaq = JSON.parse(EventFAQs);
          existingEvent.EventFAQs = parsedFaq;
        }

        if (EventLanguages) {
          const parsedEventLanguages = JSON.parse(EventLanguages);
          existingEvent.EventLanguages = parsedEventLanguages;
        }

        if (BestSuitedFor) {
          existingEvent.BestSuitedFor = BestSuitedFor;
        }

        if (EventName) {
          const trimmedEventName = EventName.trim();
          const EventNameRegex = new RegExp(`^${trimmedEventName}$`, "i");
          if (Status == EventStatus.Draft) {
            existingEvent.EventName = trimmedEventName;
          } else {
            const eventFilterQuery = {
              $and: [
                { EventName: EventNameRegex },
                {
                  EventStatus: {
                    $nin: [
                      EventStatus.Completed,
                      EventStatus.Draft,
                      EventStatus.ReviewRejected,
                    ],
                  },
                },
              ],
            };

            const existingEvents = await getEventDataService(eventFilterQuery);

            if (existingEvents.length > 0) {
              return sendResponse(res, 409, true, "Event Name Already Exists");
            }

            existingEvent.EventName = trimmedEventName;
          }
        }

        if (EventTour_id) {
          const eventTourFilterQuery = {
            _id: EventTour_id,
          };
          const isEventTourExists = await findOneEventTourDataService(
            eventTourFilterQuery
          );

          if (!isEventTourExists) {
            return sendResponse(res, 404, true, "Event Tour Not Found");
          }
          existingEvent.EventTour_id = EventTour_id;
        }

        if (EventDescription) {
          existingEvent.EventDescription = EventDescription;
        }

        if (EventTermsCondition) {
          existingEvent.EventTermsCondition = EventTermsCondition;
        }

        if (EventVedioUrl) {
          if (isValidYouTubeUrl(EventVedioUrl)) {
            existingEvent.EventVedioUrl = EventVedioUrl;
          } else {
            return sendResponse(
              res,
              409,
              true,
              `Only Youtube Vedio Url is accepted`
            );
          }
        }

        existingEvent.EventStatus = Status;
      } else if (Status == EventStatus.Published) {
        if (existingEventStatus == EventStatus.ReviewApproved) {
          existingEvent.EventStatus = Status;
        }
        return sendResponse(
          res,
          409,
          true,
          "Event Must be Send for InReview / Reviewed Approved by SuperAdmin"
        );
      }

      await existingEvent.save();

      // Return success response
      return sendResponse(res, 201, false, "Event Updated successfully");
    });
  } catch (error) {
    // Handle errors
    console.error("Organizer Update Event Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventById = async (req, res) => {
  try {
    console.log("Get Event By Id Api Called");
    console.log("Event Id:-----> " + JSON.stringify(req.body.event_id));

    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }

    const eventFilterQuery = {
      _id: event_id,
    };
    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const eventDateTimeFilterQuery = {
      Event_id: event_id,
    };

    let fetchEventDateTimes = await getEventDateTimeDataService(
      eventDateTimeFilterQuery
    );

    const EventDateTime = SortEventDateTime(fetchEventDateTimes);

    const responseObj = {
      ...isEventExists._doc,
      EventDateTime: EventDateTime,
    };

    return sendResponse(
      res,
      200,
      false,
      "Event fetched successfully",
      responseObj
    );
  } catch (error) {
    console.error("Get Event By Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getTimingsEventById = async (req, res) => {
  try {
    console.log("Get Event By Id Api Called");
    console.log("Event Id:-----> " + JSON.stringify(req.body.event_id));

    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }
    const eventFiterQuery = {
      _id: event_id,
    };

    let isEventExists = await findOneEventDataService(eventFiterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const EventDateTimeData = await getFormattedEventDateTimeByIdService(
      event_id
    );

    return sendResponse(
      res,
      200,
      false,
      "Event Date Times fetched successfully",
      EventDateTimeData
    );
  } catch (error) {
    console.error("Get Event Date Time By Event Id Error:", error.message);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const addPromoterToEvent = async (req, res) => {
  try {
    console.log("Add Promoter To Event API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateAddPromoterToEvent(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { promoterIds, event_id } = req.body;

    const eventFilterQuery = {
      _id: event_id,
    };

    const isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const updatedPromoterIdsArrayForServiceFunction = promoterIds.map(
      (promoter_id) => {
        return { promoter_id: promoter_id };
      }
    );

    const notFoundPromoter = await fetchPromoterDetailsFromDbService(
      updatedPromoterIdsArrayForServiceFunction
    );
    if (notFoundPromoter.length > 0) {
      return sendResponse(res, 404, true, `Promoter(s) Not Found`);
    }

    isEventExists.EventPromoter = updatedPromoterIdsArrayForServiceFunction;

    await isEventExists.save();

    return sendResponse(
      res,
      200,
      false,
      "Promoter Added successfully",
      isEventExists
    );
  } catch (error) {
    console.error("Error in Adding Promoter in Event Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventsAssignedPromoters = async (req, res) => {
  try {
    console.log("Get Event Assigned Promoters by Event Id Api Called");
    console.log("Event Id:-----> " + JSON.stringify(req.body.event_id));

    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }

    const eventFilterQuery = {
      _id: event_id,
    };

    let isEventExists = await findOneEventDataService(eventFilterQuery);

    if (!isEventExists) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const EventsPromoters = isEventExists._doc.EventPromoter;

    const EventPromotersWithNames = await Promise.all(
      EventsPromoters.map(async (data) => {
        const { promoter_id } = data;
        const promoterFilterQuery = {
          _id: promoter_id,
        };
        const PromoterData = await findOnePromoterDataService(
          promoterFilterQuery
        );

        const PromoterUsername = PromoterData._doc.Username;

        return {
          ...data._doc,
          PromoterUsername: PromoterUsername,
        };
      })
    );

    return sendResponse(
      res,
      200,
      false,
      "Event Promoters Fetched successfully",
      EventPromotersWithNames
    );
  } catch (error) {
    console.error(
      "Get Event Assigned Promoters By Event Id Error:",
      error.message
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventsByEventNameSearch = async (req, res) => {
  try {
    console.log("Search Events by Event Name  API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateEventNameSearchKeyword(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { AdminRole, user_id, Event_Status, search_keyword } = req.body;

    const trimmedSearchKeyWord = search_keyword.trim();

    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        EventName: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
        EventStatus: Event_Status,
      },
      [AdminRoles.Employee]: {
        CreatedBy: AdminRole,
        createduser_id: user_id,
        EventName: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
        EventStatus: Event_Status,
      },
      [AdminRoles.Promoter]: {
        "EventPromoter.promoter_id": user_id,
        EventName: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
        EventStatus: Event_Status,
      },
      [AdminRoles.Organizer]: {
        $or: [
          { "EventOrganizers.organizer_id": user_id },
          { createduser_id: user_id },
        ],
        EventName: { $regex: new RegExp(trimmedSearchKeyWord, "i") },
        EventStatus: Event_Status,
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, "Events not found");
    }

    const updatedEventsDataArray = await Promise.all(
      EventsData.map(async (event) => {
        const eventDateTimeFilterQuery = {
          Event_id: event._id,
        };
        const EventDateTimeData = await getEventDateTimeDataService(
          eventDateTimeFilterQuery
        );
        const arrangedEventDateTime = SortEventDateTime(EventDateTimeData);

        const category_id = event._doc.EventCategories[0]._doc.category_id;
        const VenueEventFlag = event._doc.VenueEventFlag;
        const OnlineEventFlag = event._doc.OnlineEventFlag;
        const VenueToBeAnnounced = event._doc.VenueToBeAnnounced;

        const categoryFilterQuery = {
          _id: category_id,
        };
        const categoryData = await findOneCategoryDataService(
          categoryFilterQuery
        );
        const categoryName = categoryData._doc.Name;

        const EventOrganizersArray = event._doc.EventOrganizers;

        const EventPromotersArray = event._doc.EventPromoter;

        let updatedEventPromotersArraywithNames = [];

        if (EventPromotersArray) {
          updatedEventPromotersArraywithNames = await Promise.all(
            EventPromotersArray.map(async (promoterData) => {
              const { promoter_id } = promoterData;
              const promoterFilterQuery = {
                _id: promoter_id,
              };
              const OrganizerData = await findOnePromoterDataService(
                promoterFilterQuery
              );
              const PromoterName = OrganizerData._doc.FullName;
              return {
                promoter_id,
                PromoterName: PromoterName,
              };
            })
          );
        }

        const updatedEventOrganizerArraywithNames = await Promise.all(
          EventOrganizersArray.map(async (organizerData) => {
            const { organizer_id } = organizerData;
            const organizerFilterQuery = {
              _id: organizer_id,
            };
            const OrganizerData = await findOneOrganizerDataService(
              organizerFilterQuery
            );
            const OrganizerName = OrganizerData._doc.FullName;
            return {
              organizer_id,
              OrganizerName,
            };
          })
        );

        const updatedEventObj = {
          ...event._doc,
          arrangedEventDateTime,
          categoryName,
          PopUpOrganizerData: updatedEventOrganizerArraywithNames,
          PopUpPromoterData: updatedEventPromotersArraywithNames,
        };
        if (VenueEventFlag == 1) {
          const venue_id = event._doc.venue_id;
          const venuefilterQuery = { _id: venue_id };
          const venueData = await findOneVenueDataService(venuefilterQuery);
          const VenueName = venueData._doc.Name;
          const VenueCity = venueData._doc.City;
          updatedEventObj["VenueName"] = VenueName;
          updatedEventObj["VenueCity"] = VenueCity;
        }

        if (OnlineEventFlag == 1) {
          updatedEventObj["VenueName"] = "Online Event";
          updatedEventObj["VenueCity"] = "-";
        }

        if (VenueToBeAnnounced == 1) {
          updatedEventObj["VenueName"] = "To Be Announced";
          updatedEventObj["VenueCity"] = "-";
        }

        return updatedEventObj;
      })
    );

    return sendResponse(
      res,
      200,
      false,
      "Event fetched successfully",
      updatedEventsDataArray
    );
  } catch (error) {
    console.error("Error in fetching Search Events by Event Name Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const EnableEvent = async (req, res) => {
  try {
    console.log("Enable the Event Api Called ");
    console.log("Event Id:-----> " + JSON.stringify(req.body.event_id));

    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }

    const eventFilterQuery = {
      _id: event_id,
    };
    const EventData = await findOneEventDataService(eventFilterQuery);

    if (!EventData) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const eventUpdateQuery = {
      EventIsEnableOrDisable: EventEnableDisableStatus.Enable,
    };
    await updateEventDataService(eventFilterQuery, eventUpdateQuery);

    return sendResponse(res, 200, false, "Event Enabled successfully");
  } catch (error) {
    console.error("Error in updating Event Status to Enable:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const DisableEvent = async (req, res) => {
  try {
    console.log("Disable the Event Api Called ");
    console.log("Event Id:-----> " + JSON.stringify(req.body.event_id));

    const { event_id } = req.body;

    if (!event_id) {
      return sendResponse(res, 404, true, "Event Id Not Provided");
    }

    const eventFilterQuery = {
      _id: event_id,
    };
    const EventData = await findOneEventDataService(eventFilterQuery);

    if (!EventData) {
      return sendResponse(res, 404, true, "Event not found");
    }

    const eventUpdateQuery = {
      EventIsEnableOrDisable: EventEnableDisableStatus.Disable,
    };
    await updateEventDataService(eventFilterQuery, eventUpdateQuery);

    return sendResponse(res, 200, false, "Event Disabled successfully");
  } catch (error) {
    console.error("Error in updating Event Status to Disable:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllEventCities = async (req, res) => {
  try {
    console.log("Get All Event Cites API Called");

    const filterQuery = {
      status: 1,
    };

    const EventCitiesData = await getEventCitiesDataService(filterQuery);

    if (!EventCitiesData.length) {
      return sendResponse(res, 404, true, "Event Cities not found");
    }
    return sendResponse(
      res,
      200,
      false,
      "Event Cities fetched successfully",
      EventCitiesData
    );
  } catch (error) {
    console.error("Error in fetching Event Cities Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllEvents = async (req, res) => {
  try {
    console.log("Get All Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    // Get UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];
    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Check if the user exists
    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    // Build event query based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            $or: [
              {
                EventStatus: {
                  $in: [
                    EventStatus.Published,
                    EventStatus.InReview,
                    EventStatus.ReviewRejected,
                  ],
                },
              },
              {
                CreatedBy: AdminRole,
                createduser_id: user_id,
                status: EventStatus.Draft,
              },
            ],
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [baseQuery, { CreatedBy: AdminRole, createduser_id: user_id }],
      },
      [AdminRoles.Promoter]: {
        $and: [baseQuery, { "EventPromoter.promoter_id": user_id }],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              {
                $and: [
                  {
                    $or: [
                      { EventStatus: EventStatus.Published },
                      { EventStatus: EventStatus.Completed },
                    ],
                  },
                  { "EventOrganizers.organizer_id": user_id },
                ],
              },
              { createduser_id: user_id },
            ],
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];
    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Fetch events
    const EventsData = await getEventDataService(eventQuery);
    if (!EventsData.length) {
      return sendResponse(res, 404, true, "Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(EventsData);

    // Filter events by date range if provided
    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = updatedEventsDataArray.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }
      return sendResponse(
        res,
        200,
        false,
        "All Events fetched successfully",
        filteredEvents.reverse()
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Events fetched successfully",
      updatedEventsDataArray.reverse()
    );
  } catch (error) {
    console.error("Error in fetching All Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getSuperAdminSelfCreatedEvents = async (req, res) => {
  try {
    console.log("Get SuperAdmin Self Created Events Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    const superAdminFilterQuery = {
      _id: user_id,
    };

    const superAdminExists = await findOneSuperAdminDataService(
      superAdminFilterQuery
    );
    if (!superAdminExists) {
      return sendResponse(res, 404, true, `SuperAdmin Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    const eventFiterQuery = {
      CreatedBy: AdminRole,
      createduser_id: user_id,
      ...baseQuery,
    };

    const SuperAdminEventsData = await getEventDataService(eventFiterQuery);

    if (!SuperAdminEventsData.length) {
      return sendResponse(res, 404, true, "Super Admin Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(
      SuperAdminEventsData
    );

    // Filter events by date range if provided
    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = updatedEventsDataArray.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }
      return sendResponse(
        res,
        200,
        false,
        "All Events fetched successfully",
        filteredEvents.reverse()
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Super Admin Event fetched successfully",
      updatedEventsDataArray.reverse()
    );
  } catch (error) {
    console.error("Error in fetching Super Admin Self Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getDraftEvents = async (req, res) => {
  try {
    console.log("Get Draft Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.Draft,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.Draft,
          },
        ],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            createduser_id: user_id,
            EventStatus: EventStatus.Draft,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, " Draft Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(EventsData);

    // Filter events by date range if provided
    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = updatedEventsDataArray.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }
      return sendResponse(
        res,
        200,
        false,
        "All Events fetched successfully",
        filteredEvents.reverse()
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Draft Event fetched successfully",
      updatedEventsDataArray.reverse()
    );
  } catch (error) {
    console.error("Error in fetching Draft Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getReviewEvents = async (req, res) => {
  try {
    console.log("Get InReview Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            EventStatus: EventStatus.InReview,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.InReview,
          },
        ],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              { "EventOrganizers.organizer_id": user_id },
              { createduser_id: user_id },
            ],
            EventStatus: EventStatus.InReview,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, " InReview Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(EventsData);

    // Filter events by date range if provided
    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = updatedEventsDataArray.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }
      return sendResponse(
        res,
        200,
        false,
        "All Events fetched successfully",
        filteredEvents.reverse()
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "InReview Event fetched successfully",
      updatedEventsDataArray.reverse()
    );
  } catch (error) {
    console.error("Error in fetching InReview Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPublishEvents = async (req, res) => {
  try {
    console.log("Get Publish Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            EventStatus: EventStatus.Published,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.Published,
          },
        ],
      },
      [AdminRoles.Promoter]: {
        $and: [
          baseQuery,
          {
            "EventPromoter.promoter_id": user_id,
            EventStatus: EventStatus.Published,
          },
        ],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              { "EventOrganizers.organizer_id": user_id },
              { createduser_id: user_id },
            ],
            EventStatus: EventStatus.Published,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, " Published Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(EventsData);

    // Filter events by date range if provided
    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = updatedEventsDataArray.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }
      return sendResponse(
        res,
        200,
        false,
        "All Events fetched successfully",
        filteredEvents.reverse()
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Published Event fetched successfully",
      updatedEventsDataArray.reverse()
    );
  } catch (error) {
    console.error("Error in fetching Published Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getCompletedEvents = async (req, res) => {
  try {
    console.log("Get Completed Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            EventStatus: EventStatus.Completed,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.Completed,
          },
        ],
      },
      [AdminRoles.Promoter]: {
        $and: [
          baseQuery,
          {
            "EventPromoter.promoter_id": user_id,
            EventStatus: EventStatus.Completed,
          },
        ],
      },

      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              { "EventOrganizers.organizer_id": user_id },
              { createduser_id: user_id },
            ],
            EventStatus: EventStatus.Completed,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, " Completed Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(EventsData);

    // Filter events by date range if provided
    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = updatedEventsDataArray.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }
      return sendResponse(
        res,
        200,
        false,
        "All Events fetched successfully",
        filteredEvents.reverse()
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Completed Event fetched successfully",
      updatedEventsDataArray.reverse()
    );
  } catch (error) {
    console.error("Error in fetching Completed Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getRejectedEvents = async (req, res) => {
  try {
    console.log("Get Rejected Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            EventStatus: EventStatus.ReviewRejected,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.ReviewRejected,
          },
        ],
      },
      [AdminRoles.Promoter]: {
        $and: [
          baseQuery,
          {
            "EventPromoter.promoter_id": user_id,

            EventStatus: EventStatus.ReviewRejected,
          },
        ],
      },

      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              { "EventOrganizers.organizer_id": user_id },
              { createduser_id: user_id },
            ],
            EventStatus: EventStatus.ReviewRejected,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, "Rejected Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(EventsData);

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      const filteredEvents = updatedEventsDataArray.filter((item) =>
        eventIds.includes(item._id)
      );

      if (!filteredEvents.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }
      return sendResponse(
        res,
        200,
        false,
        "All Events fetched successfully",
        filteredEvents.reverse()
      );
    }

    return sendResponse(
      res,
      200,
      false,
      "Rejected Event fetched successfully",
      updatedEventsDataArray.reverse()
    );
  } catch (error) {
    console.error("Error in fetching Rejected Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllPaginatedEvents = async (req, res) => {
  try {
    console.log("Get All Paginated Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];
    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);
      baseQuery._id = { $in: eventIds };
    }

    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            $or: [
              {
                EventStatus: {
                  $in: [
                    EventStatus.Published,
                    EventStatus.InReview,
                    EventStatus.ReviewRejected,
                    EventStatus.Completed,
                  ],
                },
              },
              {
                CreatedBy: AdminRole,
                createduser_id: user_id,
                status: EventStatus.Draft,
              },
            ],
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [baseQuery, { CreatedBy: AdminRole, createduser_id: user_id }],
      },
      [AdminRoles.Promoter]: {
        $and: [baseQuery, { "EventPromoter.promoter_id": user_id }],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              {
                $and: [
                  {
                    $or: [
                      { EventStatus: EventStatus.Published },
                      { EventStatus: EventStatus.Completed },
                    ],
                  },
                  { "EventOrganizers.organizer_id": user_id },
                ],
              },
              { createduser_id: user_id },
            ],
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];
    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Get total count before sorting and pagination
    const totalEvents = await countEvents(eventQuery);

    // Fetch ALL events matching query (without pagination initially)
    const allEvents = await getEventDataService(eventQuery);

    if (!allEvents.length) {
      return sendResponse(res, 404, true, "Events not found");
    }

    // Get EventDateTime data for all events
    const eventIds = allEvents.map((event) => event._id);
    const eventDateTimeData = await getEventDateTimeDataService({
      Event_id: { $in: eventIds },
    });

    // Get current datetime
    const currentDateTime = new Date(getAsiaCalcuttaCurrentDateTimeinIsoFormat());

    // Create a map of event_id to the BEST EventStartDateTime (prefer future over past)
    const eventDateMap = createEventDateMapWithFuturePreference(eventDateTimeData, currentDateTime);

    // Sort events: future events first (across all years), then past events
    const sortedEvents = allEvents.sort((a, b) => {
      const dateMapA = eventDateMap[a._id];
      const dateMapB = eventDateMap[b._id];
      
      const dateA = dateMapA ? new Date(dateMapA.date) : new Date(0);
      const dateB = dateMapB ? new Date(dateMapB.date) : new Date(0);

      const isAFuture = dateMapA ? dateMapA.isFuture : false;
      const isBFuture = dateMapB ? dateMapB.isFuture : false;

      // All future events first, then past events
      if (isAFuture && !isBFuture) return -1;
      if (!isAFuture && isBFuture) return 1;

      // Within same group (future or past), sort chronologically ascending
      return dateA.getTime() - dateB.getTime();
    });

    // Apply pagination on sorted events
    const paginatedEvents = sortedEvents.slice(skip, skip + limit);

    const updatedEventsDataArray = await getFormattedEventTableData(
      paginatedEvents,
      eventDateMap
    );

    return sendResponse(res, 200, false, "Events fetched successfully", {
      totalPages: Math.ceil(totalEvents / limit),
      currentPage: page,
      totalEvents,
      EventsData: updatedEventsDataArray,
    });
  } catch (error) {
    console.error("Error in fetching Paginated All Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPaginatedSuperAdminSelfCreatedEvents = async (req, res) => {
  try {
    console.log("Get SuperAdmin Self Created Paginated Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    const superAdminFilterQuery = {
      _id: user_id,
    };

    const superAdminExists = await findOneSuperAdminDataService(
      superAdminFilterQuery
    );
    if (!superAdminExists) {
      return sendResponse(res, 404, true, `SuperAdmin Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);

      baseQuery._id = { $in: eventIds };
    }

    const eventFiterQuery = {
      CreatedBy: AdminRole,
      createduser_id: user_id,
      ...baseQuery,
    };

    // Get total count before sorting and pagination
    const totalSuperAdminCreatedEvents = await countEvents(eventFiterQuery);

    // Fetch ALL events matching query (without pagination initially)
    const allSuperAdminEvents = await getEventDataService(eventFiterQuery);

    if (!allSuperAdminEvents.length) {
      return sendResponse(res, 404, true, "Super Admin Events not found");
    }

    // Get EventDateTime data for all events
    const eventIds = allSuperAdminEvents.map((event) => event._id);
    const eventDateTimeData = await getEventDateTimeDataService({
      Event_id: { $in: eventIds },
    });

    // Get current datetime in Asia/Kolkata timezone
    const currentDateTime = new Date(getAsiaCalcuttaCurrentDateTimeinIsoFormat());

    // Create a map of event_id to the BEST EventStartDateTime (prefer future over past)
    const eventDateMap = createEventDateMapWithFuturePreference(eventDateTimeData, currentDateTime);

    // Sort events: future events first (across all years), then past events
    const sortedEvents = allSuperAdminEvents.sort((a, b) => {
      const dateMapA = eventDateMap[a._id];
      const dateMapB = eventDateMap[b._id];
      
      const dateA = dateMapA ? new Date(dateMapA.date) : new Date(0);
      const dateB = dateMapB ? new Date(dateMapB.date) : new Date(0);

      const isAFuture = dateMapA ? dateMapA.isFuture : false;
      const isBFuture = dateMapB ? dateMapB.isFuture : false;

      // All future events first, then past events
      if (isAFuture && !isBFuture) return -1;
      if (!isAFuture && isBFuture) return 1;

      // Within same group (future or past), sort chronologically ascending
      return dateA.getTime() - dateB.getTime();
    });

    // Apply pagination on sorted events
    const paginatedEvents = sortedEvents.slice(skip, skip + limit);

    const updatedEventsDataArray = await getFormattedEventTableData(
      paginatedEvents,
      eventDateMap
    );

    return sendResponse(
      res,
      200,
      false,
      "SuperAdmin Paginated Events fetched successfully",
      {
        totalPages: Math.ceil(totalSuperAdminCreatedEvents / limit),
        currentPage: page,
        totalEvents: totalSuperAdminCreatedEvents,
        EventsData: updatedEventsDataArray,
      }
    );
  } catch (error) {
    console.error(
      "Error in fetching Paginated Super Admin Self Events Data:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPaginatedDraftEvents = async (req, res) => {
  try {
    console.log("Get All Paginated Draft Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);

      baseQuery._id = { $in: eventIds };
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.Draft,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.Draft,
          },
        ],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            createduser_id: user_id,
            EventStatus: EventStatus.Draft,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Get total count before sorting and pagination
    const totalEvents = await countEvents(eventQuery);

    // Fetch ALL events matching query (without pagination initially)
    const allEvents = await getEventDataService(eventQuery);

    if (!allEvents.length) {
      return sendResponse(res, 404, true, " Draft Events not found");
    }

    // Get EventDateTime data for all events
    const eventIds = allEvents.map((event) => event._id);
    const eventDateTimeData = await getEventDateTimeDataService({
      Event_id: { $in: eventIds },
    });

    // Get current datetime
    const currentDateTime = new Date(getAsiaCalcuttaCurrentDateTimeinIsoFormat());

    // Create a map of event_id to the BEST EventStartDateTime (prefer future over past)
    const eventDateMap = createEventDateMapWithFuturePreference(eventDateTimeData, currentDateTime);

    // Sort events: future events first (across all years), then past events
    const sortedEvents = allEvents.sort((a, b) => {
      const dateMapA = eventDateMap[a._id];
      const dateMapB = eventDateMap[b._id];
      
      const dateA = dateMapA ? new Date(dateMapA.date) : new Date(0);
      const dateB = dateMapB ? new Date(dateMapB.date) : new Date(0);

      const isAFuture = dateMapA ? dateMapA.isFuture : false;
      const isBFuture = dateMapB ? dateMapB.isFuture : false;

      // All future events first, then past events
      if (isAFuture && !isBFuture) return -1;
      if (!isAFuture && isBFuture) return 1;

      // Within same group (future or past), sort chronologically ascending
      return dateA.getTime() - dateB.getTime();
    });

    // Apply pagination on sorted events
    const paginatedEvents = sortedEvents.slice(skip, skip + limit);

    const updatedEventsDataArray = await getFormattedEventTableData(paginatedEvents, eventDateMap);

    return sendResponse(
      res,
      200,
      false,
      "Paginated Draft Events fetched successfully",
      {
        totalPages: Math.ceil(totalEvents / limit),
        currentPage: page,
        totalEvents,
        EventsData: updatedEventsDataArray,
      }
    );
  } catch (error) {
    console.error("Error in fetching Paginated Draft Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPaginatedReviewEvents = async (req, res) => {
  try {
    console.log("Get Paginated InReview Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const page = parseInt(req.body.page) || 1;

    const limit = parseInt(req.body.limit) || 10;

    const skip = (page - 1) * limit;

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);

      baseQuery._id = { $in: eventIds };
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            EventStatus: EventStatus.InReview,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.InReview,
          },
        ],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              { "EventOrganizers.organizer_id": user_id },
              { createduser_id: user_id },
            ],
            EventStatus: EventStatus.InReview,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Get total count before sorting and pagination
    const totalEvents = await countEvents(eventQuery);

    // Fetch ALL events matching query (without pagination initially)
    const allEvents = await getEventDataService(eventQuery);

    if (!allEvents.length) {
      return sendResponse(res, 404, true, " InReview Events not found");
    }

    // Get EventDateTime data for all events
    const eventIds = allEvents.map((event) => event._id);
    const eventDateTimeData = await getEventDateTimeDataService({
      Event_id: { $in: eventIds },
    });

    // Get current datetime
    const currentDateTime = new Date(getAsiaCalcuttaCurrentDateTimeinIsoFormat());

    // Create a map of event_id to the BEST EventStartDateTime (prefer future over past)
    const eventDateMap = createEventDateMapWithFuturePreference(eventDateTimeData, currentDateTime);

    // Sort events: future events first (across all years), then past events
    const sortedEvents = allEvents.sort((a, b) => {
      const dateMapA = eventDateMap[a._id];
      const dateMapB = eventDateMap[b._id];
      
      const dateA = dateMapA ? new Date(dateMapA.date) : new Date(0);
      const dateB = dateMapB ? new Date(dateMapB.date) : new Date(0);

      const isAFuture = dateMapA ? dateMapA.isFuture : false;
      const isBFuture = dateMapB ? dateMapB.isFuture : false;

      // All future events first, then past events
      if (isAFuture && !isBFuture) return -1;
      if (!isAFuture && isBFuture) return 1;

      // Within same group (future or past), sort chronologically ascending
      return dateA.getTime() - dateB.getTime();
    });

    // Apply pagination on sorted events
    const paginatedEvents = sortedEvents.slice(skip, skip + limit);

    const updatedEventsDataArray = await getFormattedEventTableData(paginatedEvents, eventDateMap);

    // Filter events by date range if provided
    return sendResponse(
      res,
      200,
      false,
      "Paginated In-Review Events fetched successfully",
      {
        totalPages: Math.ceil(totalEvents / limit),
        currentPage: page,
        totalEvents,
        EventsData: updatedEventsDataArray,
      }
    );
  } catch (error) {
    console.error("Error in fetching Paginated InReview Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPaginatedPublishEvents = async (req, res) => {
  try {
    console.log("Get Paginated Publish Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    const page = parseInt(req.body.page) || 1;

    const limit = parseInt(req.body.limit) || 10;

    const skip = (page - 1) * limit;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);

      baseQuery._id = { $in: eventIds };
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            EventStatus: EventStatus.Published,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.Published,
          },
        ],
      },
      [AdminRoles.Promoter]: {
        $and: [
          baseQuery,
          {
            "EventPromoter.promoter_id": user_id,
            EventStatus: EventStatus.Published,
          },
        ],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              { "EventOrganizers.organizer_id": user_id },
              { createduser_id: user_id },
            ],
            EventStatus: EventStatus.Published,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Get total count before sorting and pagination
    const totalEvents = await countEvents(eventQuery);

    // Fetch ALL events matching query (without pagination initially)
    const allEvents = await getEventDataService(eventQuery);

    if (!allEvents.length) {
      return sendResponse(res, 404, true, " Published Events not found");
    }

    // Get EventDateTime data for all events
    const eventIds = allEvents.map((event) => event._id);
    const eventDateTimeData = await getEventDateTimeDataService({
      Event_id: { $in: eventIds },
    });

    // Get current datetime first
    const currentDateTime = new Date(getAsiaCalcuttaCurrentDateTimeinIsoFormat());

    // Create a map of event_id to the BEST EventStartDateTime
    // If event has multiple dates, prefer future dates over past
    const eventDateMap = {};
    eventDateTimeData.forEach((dt) => {
      const dtDate = new Date(dt.EventStartDateTime);
      const isFuture = dtDate.getTime() >= currentDateTime.getTime();

      if (!eventDateMap[dt.Event_id]) {
        eventDateMap[dt.Event_id] = {
          date: dt.EventStartDateTime,
          isFuture: isFuture
        };
      } else {
        const existing = eventDateMap[dt.Event_id];
        const existingDate = new Date(existing.date);

        // Prefer future dates over past dates
        if (isFuture && !existing.isFuture) {
          // New date is future, existing is past → use new
          eventDateMap[dt.Event_id] = {
            date: dt.EventStartDateTime,
            isFuture: isFuture
          };
        } else if (isFuture && existing.isFuture) {
          // Both future → use earlier one
          if (dtDate < existingDate) {
            eventDateMap[dt.Event_id] = {
              date: dt.EventStartDateTime,
              isFuture: isFuture
            };
          }
        } else if (!isFuture && !existing.isFuture) {
          // Both past → use earlier one
          if (dtDate < existingDate) {
            eventDateMap[dt.Event_id] = {
              date: dt.EventStartDateTime,
              isFuture: isFuture
            };
          }
        }
        // else: new is past, existing is future → keep existing
      }
    });

    console.log("🔍 DEBUG: Current DateTime:", currentDateTime.toISOString());

    // Sort events: future events first (across all years), then past events
    const sortedEvents = allEvents.sort((a, b) => {
      const dateMapA = eventDateMap[a._id];
      const dateMapB = eventDateMap[b._id];
      
      const dateA = dateMapA ? new Date(dateMapA.date) : new Date(0);
      const dateB = dateMapB ? new Date(dateMapB.date) : new Date(0);

      const isAFuture = dateMapA ? dateMapA.isFuture : false;
      const isBFuture = dateMapB ? dateMapB.isFuture : false;

      // All future events first, then past events
      if (isAFuture && !isBFuture) return -1;
      if (!isAFuture && isBFuture) return 1;

      // Within same group (future or past), sort chronologically ascending
      return dateA.getTime() - dateB.getTime();
    });

    console.log("🔍 DEBUG: Sorted Events (first 10):");
    sortedEvents.slice(0, 10).forEach((event, index) => {
      const eventDateInfo = eventDateMap[event._id];
      const dateStr = eventDateInfo ? eventDateInfo.date : "NO DATE";
      const futureStr = eventDateInfo ? (eventDateInfo.isFuture ? "FUTURE" : "PAST") : "UNKNOWN";
      console.log(`  ${index + 1}. [${futureStr}] ${event.EventName} | ${dateStr}`);
    });

    // Apply pagination on sorted events
    const paginatedEvents = sortedEvents.slice(skip, skip + limit);

    console.log("🔍 DEBUG: Paginated Events (after slice):");
    paginatedEvents.forEach((event, index) => {
      const eventDateInfo = eventDateMap[event._id];
      const dateStr = eventDateInfo ? eventDateInfo.date : "NO DATE";
      const futureStr = eventDateInfo ? (eventDateInfo.isFuture ? "FUTURE" : "PAST") : "UNKNOWN";
      console.log(`  ${index + 1}. [${futureStr}] ${event.EventName} | ${dateStr}`);
    });

    const updatedEventsDataArray = await getFormattedEventTableData(paginatedEvents, eventDateMap);

    console.log("🔍 DEBUG: Formatted Events (response):");
    updatedEventsDataArray.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.EventName}`);
    });

    return sendResponse(
      res,
      200,
      false,
      "Paginated Publish Events fetched successfully",
      {
        totalPages: Math.ceil(totalEvents / limit),
        currentPage: page,
        totalEvents,
        EventsData: updatedEventsDataArray,
      }
    );
  } catch (error) {
    console.error("Error in fetching Paginated Published Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPaginatedCompletedEvents = async (req, res) => {
  try {
    console.log("Get Paginated Completed Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    const page = parseInt(req.body.page) || 1;

    const limit = parseInt(req.body.limit) || 10;

    const skip = (page - 1) * limit;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);

      baseQuery._id = { $in: eventIds };
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            EventStatus: EventStatus.Completed,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.Completed,
          },
        ],
      },
      [AdminRoles.Promoter]: {
        $and: [
          baseQuery,
          {
            "EventPromoter.promoter_id": user_id,
            EventStatus: EventStatus.Completed,
          },
        ],
      },

      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              { "EventOrganizers.organizer_id": user_id },
              { createduser_id: user_id },
            ],
            EventStatus: EventStatus.Completed,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Get total count before sorting and pagination
    const totalEvents = await countEvents(eventQuery);

    // Fetch ALL events matching query (without pagination initially)
    const allEvents = await getEventDataService(eventQuery);

    if (!allEvents.length) {
      return sendResponse(res, 404, true, " Published Events not found");
    }

    // Get EventDateTime data for all events
    const eventIds = allEvents.map((event) => event._id);
    const eventDateTimeData = await getEventDateTimeDataService({
      Event_id: { $in: eventIds },
    });

    // Get current datetime
    const currentDateTime = new Date(getAsiaCalcuttaCurrentDateTimeinIsoFormat());

    // Create a map of event_id to the BEST EventStartDateTime (prefer future over past)
    const eventDateMap = createEventDateMapWithFuturePreference(eventDateTimeData, currentDateTime);

    // Sort events: future events first (across all years), then past events
    const sortedEvents = allEvents.sort((a, b) => {
      const dateMapA = eventDateMap[a._id];
      const dateMapB = eventDateMap[b._id];
      
      const dateA = dateMapA ? new Date(dateMapA.date) : new Date(0);
      const dateB = dateMapB ? new Date(dateMapB.date) : new Date(0);

      const isAFuture = dateMapA ? dateMapA.isFuture : false;
      const isBFuture = dateMapB ? dateMapB.isFuture : false;

      // All future events first, then past events
      if (isAFuture && !isBFuture) return -1;
      if (!isAFuture && isBFuture) return 1;

      // Within same group (future or past), sort chronologically ascending
      return dateA.getTime() - dateB.getTime();
    });

    // Apply pagination on sorted events
    const paginatedEvents = sortedEvents.slice(skip, skip + limit);

    const updatedEventsDataArray = await getFormattedEventTableData(paginatedEvents, eventDateMap);

    return sendResponse(
      res,
      200,
      false,
      "Paginated Completed Events fetched successfully",
      {
        totalPages: Math.ceil(totalEvents / limit),
        currentPage: page,
        totalEvents,
        EventsData: updatedEventsDataArray,
      }
    );
  } catch (error) {
    console.error("Error in fetching Paginated Completed Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getPaginatedRejectedEvents = async (req, res) => {
  try {
    console.log("Get Paginated Rejected Events API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    const page = parseInt(req.body.page) || 1;

    const limit = parseInt(req.body.limit) || 10;

    const skip = (page - 1) * limit;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (eventNameSearchKeyword) {
      baseQuery.EventName = { $regex: eventNameSearchKeyword, $options: "i" };
    }

    if (CityName) {
      const venuesInCity = await getVenueDataService({
        City: { $regex: new RegExp(`^${CityName}$`, "i") },
      });

      const venueIdsArray = venuesInCity.map((venue) => venue._id);
      baseQuery = {
        $or: [
          { venue_id: { $in: venueIdsArray } },
          {
            VenueToBeAnnouncedCity: {
              $regex: new RegExp(`^${CityName}$`, "i"),
            },
          },
        ],
      };
    }

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (venue_id) {
      const venueExists = await findOneVenueDataService({ _id: venue_id });
      if (!venueExists) {
        return sendResponse(res, 404, true, `Venue Not Found`);
      }
      baseQuery.venue_id = venue_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    if (startDate && endDate) {
      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (!EventDateTimeData.length) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);

      baseQuery._id = { $in: eventIds };
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            EventStatus: EventStatus.ReviewRejected,
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [
          baseQuery,
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            EventStatus: EventStatus.ReviewRejected,
          },
        ],
      },
      [AdminRoles.Promoter]: {
        $and: [
          baseQuery,
          {
            "EventPromoter.promoter_id": user_id,

            EventStatus: EventStatus.ReviewRejected,
          },
        ],
      },

      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              { "EventOrganizers.organizer_id": user_id },
              { createduser_id: user_id },
            ],
            EventStatus: EventStatus.ReviewRejected,
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Get total count before sorting and pagination
    const totalEvents = await countEvents(eventQuery);

    // Fetch ALL events matching query (without pagination initially)
    const allEvents = await getEventDataService(eventQuery);

    if (!allEvents.length) {
      return sendResponse(res, 404, true, "Rejected Events not found");
    }

    // Get EventDateTime data for all events
    const eventIds = allEvents.map((event) => event._id);
    const eventDateTimeData = await getEventDateTimeDataService({
      Event_id: { $in: eventIds },
    });

    // Get current datetime
    const currentDateTime = new Date(getAsiaCalcuttaCurrentDateTimeinIsoFormat());

    // Create a map of event_id to the BEST EventStartDateTime (prefer future over past)
    const eventDateMap = createEventDateMapWithFuturePreference(eventDateTimeData, currentDateTime);

    // Sort events: upcoming first (EventStartDateTime >= current), then past events
    const sortedEvents = allEvents.sort((a, b) => {
      const dateMapA = eventDateMap[a._id];
      const dateMapB = eventDateMap[b._id];
      
      const dateA = dateMapA ? new Date(dateMapA.date) : new Date(0);
      const dateB = dateMapB ? new Date(dateMapB.date) : new Date(0);

      const isAUpcoming = dateMapA ? dateMapA.isFuture : false;
      const isBUpcoming = dateMapB ? dateMapB.isFuture : false;

      // Upcoming events first
      if (isAUpcoming && !isBUpcoming) return -1;
      if (!isAUpcoming && isBUpcoming) return 1;

      // Both upcoming or both past - sort by date ascending
      return dateA.getTime() - dateB.getTime();
    });

    // Apply pagination on sorted events
    const paginatedEvents = sortedEvents.slice(skip, skip + limit);

    const updatedEventsDataArray = await getFormattedEventTableData(
      paginatedEvents,
      eventDateMap
    );

    return sendResponse(
      res,
      200,
      false,
      "Paginated Rejected Events fetched successfully",
      {
        totalPages: Math.ceil(totalEvents / limit),

        currentPage: page,

        totalEvents,

        EventsData: updatedEventsDataArray,
      }
    );
  } catch (error) {
    console.error("Error in fetching Paginated Rejected Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getAllEventsForPromotersDashboard = async (req, res) => {
  try {
    console.log("Get All Events Data for Promoter Dashboard API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { AdminRole, user_id, eventNameSearchKeyword, startDate, endDate } =
      req.body;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.Promoter]: Promoter,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.Promoter]: {
        "EventPromoter.promoter_id": user_id,
        EventStatus: { $in: [EventStatus.Published] },
      },
    };

    if (eventNameSearchKeyword) {
      eventQueries[AdminRoles.Promoter].EventName = {
        $regex: eventNameSearchKeyword,
        $options: "i",
      };
    }

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    let EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, " Promoter Events not found");
    }

    const updatedEventsDataArray = await getFormattedPromoterEventsCardData(
      EventsData
    );

    if (startDate) {
      if (!endDate) {
        return sendResponse(res, 404, true, "End Date Not Found");
      }

      const EventDateTimeData = await getEventDateTimeDataService({
        EventStartDateTime: { $gte: startDate, $lte: endDate },
      });

      if (EventDateTimeData.length == 0) {
        return sendResponse(res, 404, false, "No Events Found For Dates");
      }

      const eventIds = EventDateTimeData.map((item) => item.Event_id);

      const filteredData = updatedEventsDataArray.filter((item) =>
        eventIds.includes(item._id)
      );

      if (filteredData.length == 0) {
        return sendResponse(res, 404, false, "No Events Found");
      }

      const reversedFilteredArray = filteredData.reverse();

      return sendResponse(
        res,
        200,
        false,
        "All Promoter Event fetched successfully",
        reversedFilteredArray
      );
    }

    const reversedFilteredArray = updatedEventsDataArray.reverse();

    return sendResponse(
      res,
      200,
      false,
      "All Promoter Event fetched successfully",
      reversedFilteredArray
    );
  } catch (error) {
    console.error(
      "Error in fetching All Events Data For PromoterDashboard:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventsReportsForPromoters = async (req, res) => {
  try {
    console.log("Get All Events Data for Promoter Dashboard API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate event creation request
    const validationResponse = await validateEventsReportsData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const { AdminRole, user_id, eventNameSearchKeyword, startDate, endDate } =
      req.body;

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.Promoter]: Promoter,
    };

    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Fetch events based on AdminRole
    const eventQueries = {
      [AdminRoles.Promoter]: {
        "EventPromoter.promoter_id": user_id,
        EventStatus: { $in: [EventStatus.Published, EventStatus.Completed] },
        EventName: {
          $regex: eventNameSearchKeyword,
          $options: "i",
        },
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    let EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, "Promoter Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(EventsData);

    const EventDateTimeData = await getEventDateTimeDataService({
      EventStartDateTime: { $gte: startDate, $lte: endDate },
    });

    if (!EventDateTimeData.length) {
      return sendResponse(res, 404, false, "No Events Found For Dates");
    }

    const eventIds = EventDateTimeData.map((item) => item.Event_id);
    const filteredData = updatedEventsDataArray.filter((item) =>
      eventIds.includes(item._id)
    );

    if (!filteredData.length) {
      return sendResponse(res, 404, false, "No Events Found");
    }

    const reversedFilteredArray = filteredData.reverse();

    return sendResponse(
      res,
      200,
      false,
      "All Promoter Event fetched successfully",
      reversedFilteredArray
    );
  } catch (error) {
    console.error(
      "Error in fetching All Events Data For PromoterDashboard:",
      error
    );
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getEventsByNameandDateTime = async (req, res) => {
  try {
    console.log("Get Events By Name DateTime API Called");
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    const { AdminRole, user_id, EventName, DateTime } = req.body;

    // Check if required parameters are provided
    if (!AdminRole || !user_id || !EventName || !DateTime) {
      return sendResponse(res, 400, true, "Missing required parameters");
    }

    // Get the UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];

    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    const trimmeddEventName = EventName.trim();

    // Create a query to fetch events based on AdminRole and EventName
    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $or: [
          {
            EventStatus: {
              $in: [
                EventStatus.Published,
                EventStatus.InReview,
                EventStatus.ReviewRejected,
              ],
            },
          },
          {
            CreatedBy: AdminRole,
            createduser_id: user_id,
            status: EventStatus.Draft,
          },
        ],
        EventName: { $regex: new RegExp(trimmeddEventName, "i") }, // Case-insensitive match for EventName
      },
      [AdminRoles.Employee]: {
        CreatedBy: AdminRole,
        createduser_id: user_id,
        EventName: { $regex: new RegExp(trimmeddEventName, "i") },
      },
      [AdminRoles.Promoter]: {
        "EventPromoter.promoter_id": user_id,
        EventName: { $regex: new RegExp(trimmeddEventName, "i") },
      },
      [AdminRoles.Organizer]: {
        $and: [
          {
            $or: [
              {
                $and: [
                  {
                    EventStatus: {
                      $in: [EventStatus.Published, EventStatus.Completed],
                    },
                  },
                  { "EventOrganizers.organizer_id": user_id },
                ],
              },
              { createduser_id: user_id },
            ],
          },
        ],
        EventName: { $regex: new RegExp(trimmeddEventName, "i") },
      },
    };

    const eventQuery = eventQueries[AdminRole];

    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    const EventsData = await getEventDataService(eventQuery);

    if (!EventsData.length) {
      return sendResponse(res, 404, true, "Events not found");
    }

    const updatedEventsDataArray = await getFormattedEventTableData(EventsData);

    // Check if the DateTime exists within the filtered events
    const matchingEvents = updatedEventsDataArray.filter((event) =>
      event.arrangedEventDateTime.some((dateTime) => {
        const eventStartDate = new Date(dateTime.EventStartDateTime)
          .toISOString()
          .split("T")[0];
        const reqDate = new Date(DateTime).toISOString().split("T")[0];
        return eventStartDate == reqDate;
      })
    );

    if (!matchingEvents.length) {
      return sendResponse(
        res,
        404,
        true,
        "DateTime not found for the specified event"
      );
    }

    const responseData = matchingEvents[0];

    return sendResponse(
      res,
      200,
      false,
      "Event fetched successfully",
      responseData
    );
  } catch (error) {
    console.error("Error in fetching All Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const getVenueCitiesandPromoterDataforEvents = async (req, res) => {
  try {
    console.log(
      "Get Venues,City,Promoters for Organizers and Promoters API Called"
    );
    console.log("Req Body Parameters:-----> " + JSON.stringify(req.body));

    // Validate request
    const validationResponse = await validateUserForData(req.body);
    if (validationResponse.error) {
      return sendResponse(res, 400, true, validationResponse.errorMessage);
    }

    const {
      AdminRole,
      user_id,
      eventNameSearchKeyword,
      startDate,
      endDate,
      CityName,
      organizer_id,
      venue_id,
      promoter_id,
    } = req.body;

    // Get UserModel based on AdminRole
    const userModels = {
      [AdminRoles.SuperAdmin]: SuperAdmin,
      [AdminRoles.Organizer]: Organizer,
      [AdminRoles.Promoter]: Promoter,
      [AdminRoles.Employee]: Employee,
    };
    const UserModel = userModels[AdminRole];
    if (!UserModel) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Check if the user exists
    const userExists = await UserModel.findOne({ _id: user_id });
    if (!userExists) {
      return sendResponse(res, 404, true, `${AdminRole} Not Found`);
    }

    // Build the base query
    let baseQuery = {};

    if (organizer_id) {
      const organizerExists = await findOneOrganizerDataService({
        _id: organizer_id,
      });
      if (!organizerExists) {
        return sendResponse(res, 404, true, `Organizer Not Found`);
      }
      baseQuery["EventOrganizers.organizer_id"] = organizer_id;
    }

    if (promoter_id) {
      const promoterExists = await findOnePromoterDataService({
        _id: promoter_id,
      });
      if (!promoterExists) {
        return sendResponse(res, 404, true, `Promoter Not Found`);
      }
      baseQuery["EventPromoter.promoter_id"] = promoter_id;
    }

    const eventQueries = {
      [AdminRoles.SuperAdmin]: {
        $and: [
          baseQuery,
          {
            $or: [
              {
                EventStatus: {
                  $in: [
                    EventStatus.Published,
                    EventStatus.InReview,
                    EventStatus.ReviewRejected,
                  ],
                },
              },
              {
                CreatedBy: AdminRole,
                createduser_id: user_id,
                status: EventStatus.Draft,
              },
            ],
          },
        ],
      },
      [AdminRoles.Employee]: {
        $and: [baseQuery, { CreatedBy: AdminRole, createduser_id: user_id }],
      },
      [AdminRoles.Promoter]: {
        $and: [baseQuery, { "EventPromoter.promoter_id": user_id }],
      },
      [AdminRoles.Organizer]: {
        $and: [
          baseQuery,
          {
            $or: [
              {
                $and: [
                  {
                    $or: [
                      { EventStatus: EventStatus.Published },
                      { EventStatus: EventStatus.Completed },
                    ],
                  },
                  { "EventOrganizers.organizer_id": user_id },
                ],
              },
              { createduser_id: user_id },
            ],
          },
        ],
      },
    };

    const eventQuery = eventQueries[AdminRole];
    if (!eventQuery) {
      return sendResponse(res, 400, true, "Invalid AdminRole");
    }

    // Fetch events
    const EventsData = await getEventDataService(eventQuery);
    if (!EventsData.length) {
      return sendResponse(res, 404, true, "Events not found");
    }
    let EventVenues = [];
    let EventCities = [];
    let EventPromoters = [];

    await Promise.all(
      EventsData.map(async (event) => {
        const VenueEventFlag = event._doc.VenueEventFlag;
        const VenueToBeAnnounced = event._doc.VenueToBeAnnounced;

        const EventPromotersArray = event._doc.EventPromoter;

        let updatedEventPromotersArraywithNames = [];

        if (EventPromotersArray) {
          updatedEventPromotersArraywithNames = await Promise.all(
            EventPromotersArray.map(async (promoterData) => {
              const { promoter_id } = promoterData;
              const promoterFilterQuery = {
                _id: promoter_id,
              };
              const OrganizerData = await findOnePromoterDataService(
                promoterFilterQuery
              );
              const PromoterUsername = OrganizerData._doc.Username;
              return {
                promoter_id,
                PromoterUsername: PromoterUsername,
              };
            })
          );
        }

        EventPromoters = [
          ...EventPromoters,
          ...updatedEventPromotersArraywithNames,
        ];

        if (VenueEventFlag == 1) {
          const venue_id = event._doc.venue_id;
          const venuefilterQuery = { _id: venue_id };
          const venueData = await findOneVenueDataService(venuefilterQuery);

          const VenueObj = {
            venue_id: venueData._doc._id,
            VenueName: venueData._doc.Name,
          };
          EventVenues.push(VenueObj);

          const VenueCity = venueData._doc.City;

          const cityFilterQuery = { CityName: VenueCity };
          const CityData = await findOneEventCitiesDataService(cityFilterQuery);

          const CityObj = {
            city_id: CityData._doc._id,
            CityName: CityData._doc.CityName,
          };
          EventCities.push(CityObj);
        }

        if (VenueToBeAnnounced == 1) {
          const VenueCity = venueData._doc.VenueToBeAnnouncedCity;

          const cityFilterQuery = { CityName: VenueCity };
          const CityData = await findOneEventCitiesDataService(cityFilterQuery);

          const CityObj = {
            city_id: CityData._doc._id,
            CityName: CityData._doc.CityName,
          };
          EventCities.push(CityObj);
        }
      })
    );

    // Remove duplicates
    EventVenues = Array.from(
      new Map(EventVenues.map((v) => [v.venue_id, v])).values()
    );
    EventCities = Array.from(
      new Map(EventCities.map((c) => [c.city_id, c])).values()
    );
    EventPromoters = Array.from(
      new Map(EventPromoters.map((p) => [p.promoter_id, p])).values()
    );

    const respObj = {
      EventVenues,
      EventCities,
      EventPromoters,
    };

    return sendResponse(
      res,
      200,
      false,
      "Events fetched successfully",
      respObj
    );
  } catch (error) {
    console.error("Error in fetching All Events Data:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export {
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
  addPromoterToEvent,
  getEventsAssignedPromoters,
  getDraftEvents,
  getReviewEvents,
  getPublishEvents,
  getCompletedEvents,
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
};
