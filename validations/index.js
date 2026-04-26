import Joi from "joi";
import {
  isTourEvent,
  EventStatus,
  DownloadExcelReport,
  EventVisibility,
  EventType,
  isEventFeatured,
  AdminRoles,
  SendDefaultPasswordMail,
  EventVenueTobeAnnounced,
  ConvinienceFeeUnit,
  TicketType,
  TicketVisiblity,
  TicketStatus,
  TicketAvailability,
  IsVenueAvailable,
  IsOnlineEvent,
  OrganizerOwnerType,
  ReportType,
  ScannerUserType,
  PromocodeCanbeUsedIn,
  PromocodeUnit,
  PromocodeOneTimePerCustomerFlag,
  PromocodeValid,
} from "../helpers/Enum.js";

async function validateArtistRegistration(data) {
  let error = false;
  const schema = Joi.object({
    Name: Joi.string().min(5).max(50).required(),
    Email: Joi.string().email().min(4).max(1024).required(),
    Description: Joi.string().min(5).max(1024).required(),
    PhoneNo: Joi.string()
      .pattern(/^\d{10}$/)
      .required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateArtistDataUpdate(data) {
  let error = false;
  const schema = Joi.object({
    Name: Joi.string().min(5).max(50),
    Email: Joi.string().email().min(0).max(1024),
    Description: Joi.string().min(0).max(1024),
    artist_id: Joi.string().min(5).max(1024).required(),
    PhoneNo: Joi.string().pattern(/^\d{10}$/),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateImageDelete(data) {
  let error = false;
  const schema = Joi.object({
    artist_id: Joi.string().min(2).required(),
    image_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateArtistImageUpload(data) {
  let error = false;
  const schema = Joi.object({
    artist_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateCategoryCreation(data) {
  let error = false;
  const schema = Joi.object({
    Name: Joi.string().min(5).max(50).required(),
    Description: Joi.string().min(0).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateCategoryDataUpdate(data) {
  let error = false;
  const schema = Joi.object({
    Name: Joi.string().min(5).max(50),
    Description: Joi.string().min(0).max(1024),
    category_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateCategoryImageDelete(data) {
  let error = false;
  const schema = Joi.object({
    category_id: Joi.string().min(2).required(),
    image_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateCategoryImageUpload(data) {
  let error = false;
  const schema = Joi.object({
    category_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateVenueCreation(data) {
  let error = false;
  const schema = Joi.object({
    Country: Joi.string().min(3).max(50).required(),
    CountryIsoCode: Joi.string().min(2).max(20).required(),
    State: Joi.string().min(3).max(50).required(),
    StateIsoCode: Joi.string().min(2).max(20).required(),
    City: Joi.string().min(3).max(50).required(),
    CityIsoCode: Joi.string().min(2).max(20).required(),
    Map_Location: Joi.string().min(5).required(),
    Name: Joi.string().min(3).max(50).required(),
    Description: Joi.string().min(5).max(1024).required(),
    Address: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateVenueUpdateData(data) {
  let error = false;
  const schema = Joi.object({
    Country: Joi.string().min(3).max(50),
    CountryIsoCode: Joi.string().min(2).max(20),
    State: Joi.string().min(3).max(50),
    StateIsoCode: Joi.string().min(2).max(20),
    City: Joi.string().min(3).max(50),
    CityIsoCode: Joi.string().min(2).max(20),
    Map_Location: Joi.string().min(5),
    Name: Joi.string().min(3).max(50),
    Description: Joi.string().min(5).max(1024),
    Address: Joi.string().min(5).max(1024),
    venue_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateVenueImageDelete(data) {
  let error = false;
  const schema = Joi.object({
    venue_id: Joi.string().min(2).required(),
    image_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateVenueImageUpload(data) {
  let error = false;
  const schema = Joi.object({
    venue_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateGenreCreation(data) {
  let error = false;
  const schema = Joi.object({
    Name: Joi.string().min(3).max(50).required(),
    Description: Joi.string().min(0).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateGenreDataUpdate(data) {
  let error = false;
  const schema = Joi.object({
    Name: Joi.string().min(3).max(50),
    Description: Joi.string().min(0).max(1024),
    genre_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateGenreImageDelete(data) {
  let error = false;
  const schema = Joi.object({
    genre_id: Joi.string().min(2).required(),
    image_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateGenreImageUpload(data) {
  let error = false;
  const schema = Joi.object({
    genre_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateFaqCreation(data) {
  let error = false;
  const schema = Joi.object({
    Tag: Joi.string().min(3).max(50).required(),
    Question: Joi.string().min(5).max(1024).required(),
    Answer: Joi.string().min(2).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateFaqDataUpdate(data) {
  let error = false;
  const schema = Joi.object({
    Tag: Joi.string().min(3).max(50),
    Question: Joi.string().min(5).max(1024),
    Answer: Joi.string().min(2).max(1024),
    faq_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateSuperAdmin(data) {
  let error = false;
  const schema = Joi.object({
    Username: Joi.string().min(4).max(1024).required(),
    Password: Joi.string().min(5).max(10).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateChangePassword(data) {
  let error = false;
  const schema = Joi.object({
    CurrentPassword: Joi.string().min(5).max(10).required(),
    NewPassword: Joi.string().min(5).max(10).required(),
    user_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateSuperAdminProfileUpdate(data) {
  let error = false;
  const schema = Joi.object({
    FullName: Joi.string().min(3).max(50),
    Phone1: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10),
    Phone2: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10),
    Address: Joi.string().min(3).max(1024),
    Country: Joi.string().min(3).max(500),
    CountryIsoCode: Joi.string().min(2).max(10),
    State: Joi.string().min(3).max(500),
    StateIsoCode: Joi.string().min(2).max(10),
    City: Joi.string().min(3).max(500),
    CityIsoCode: Joi.string().min(2).max(10),
    Email: Joi.string().email().min(0).max(1024),
    user_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validaterRegisterOrganizer(data) {
  let error = false;
  const schema = Joi.object({
    FullName: Joi.string().min(5).max(50).required(),
    Username: Joi.string().min(5).max(50).required(),
    OwnerType: Joi.number()
      .valid(OrganizerOwnerType.Club, OrganizerOwnerType.EventCompany)
      .required(),
    CompanyName: Joi.string().min(5).max(50).required(),
    Email: Joi.string().email().min(4).max(1024),
    Password: Joi.string().min(5).max(10).required(),
    Phone1: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10),
    Country: Joi.string().min(3).max(500).required(),
    CountryIsoCode: Joi.string().min(2).max(10).required(),
    State: Joi.string().min(3).max(500).required(),
    StateIsoCode: Joi.string().min(2).max(10).required(),
    City: Joi.string().min(3).max(500).required(),
    CityIsoCode: Joi.string().min(2).max(10).required(),
    SendMailFlag: Joi.number()
      .valid(SendDefaultPasswordMail.Yes, SendDefaultPasswordMail.No)
      .required(),
    CreatedBy: Joi.number()
      .valid(AdminRoles.SuperAdmin, AdminRoles.Employee, AdminRoles.Organizer)
      .required(),
    createduser_id: Joi.string().min(5).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateOrganizerLogin(data) {
  let error = false;
  const schema = Joi.object({
    Username: Joi.string().min(5).max(1024).required(),
    Password: Joi.string().min(5).max(10).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateOrganizerProfileUpdate(data) {
  let error = false;
  const schema = Joi.object({
    FullName: Joi.string().min(3).max(50),
    Email: Joi.string().min(3).max(50),
    Phone1: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10),
    Phone2: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10),
    BirthDay: Joi.date().max("now").iso(),
    Gender: Joi.string().min(3).max(10),
    About: Joi.string().min(3).max(1024),
    Address: Joi.string().min(3).max(1024),
    Country: Joi.string().min(3).max(20),
    CountryIsoCode: Joi.string().min(2).max(10),
    State: Joi.string().min(3).max(20),
    StateIsoCode: Joi.string().min(2).max(10),
    City: Joi.string().min(3).max(20),
    CityIsoCode: Joi.string().min(2).max(10),
    user_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validaterRegisterPromoter(data) {
  let error = false;
  const schema = Joi.object({
    FullName: Joi.string().min(5).max(50).required(),
    Username: Joi.string().min(5).max(50).required(),
    Email: Joi.string().email().min(4).max(1024),
    Password: Joi.string().min(5).max(10).required(),
    Phone1: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10),
    Country: Joi.string().min(3).max(500).required(),
    CountryIsoCode: Joi.string().min(2).max(10).required(),
    State: Joi.string().min(3).max(500).required(),
    StateIsoCode: Joi.string().min(2).max(10).required(),
    City: Joi.string().min(3).max(500).required(),
    CityIsoCode: Joi.string().min(2).max(10).required(),
    SendMailFlag: Joi.number()
      .valid(SendDefaultPasswordMail.Yes, SendDefaultPasswordMail.No)
      .required(),
    CreatedBy: Joi.number()
      .valid(AdminRoles.SuperAdmin, AdminRoles.Employee, AdminRoles.Organizer)
      .required(),
    createduser_id: Joi.string().min(5).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validatePromoterLogin(data) {
  let error = false;
  const schema = Joi.object({
    Username: Joi.string().min(5).max(1024).required(),
    Password: Joi.string().min(5).max(10).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validatePromoterProfileUpdate(data) {
  let error = false;
  const schema = Joi.object({
    FullName: Joi.string().min(3).max(50),
    Email: Joi.string().min(2),
    Phone1: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10),
    Phone2: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10),
    Address: Joi.string().min(3).max(1024),
    Country: Joi.string().min(3).max(20),
    CountryIsoCode: Joi.string().min(2).max(10),
    State: Joi.string().min(3).max(20),
    StateIsoCode: Joi.string().min(2).max(10),
    City: Joi.string().min(3).max(20),
    CityIsoCode: Joi.string().min(2).max(10),
    user_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateResetPasswordEmail(data) {
  let error = false;
  const schema = Joi.object({
    Email: Joi.string().email().min(4).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateResetPasswordData(data) {
  let error = false;
  const schema = Joi.object({
    new_password: Joi.string().min(5).max(10).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateSuperAdminEventCreation(data) {
  let error = false;
  let parsedData = { ...data };
  try {
    if (typeof parsedData.EventOrganizers == "string") {
      parsedData.EventOrganizers = JSON.parse(parsedData.EventOrganizers);
    }
    if (typeof parsedData.EventCategories == "string") {
      parsedData.EventCategories = JSON.parse(parsedData.EventCategories);
    }
    if (typeof parsedData.EventArtist == "string") {
      parsedData.EventArtist = JSON.parse(parsedData.EventArtist);
    }
    if (typeof parsedData.EventGenre == "string") {
      parsedData.EventGenre = JSON.parse(parsedData.EventGenre);
    }
    if (typeof parsedData.EventFAQs == "string") {
      parsedData.EventFAQs = JSON.parse(parsedData.EventFAQs);
    }
    if (typeof parsedData.EventDateTime == "string") {
      parsedData.EventDateTime = JSON.parse(parsedData.EventDateTime);
    }
    if (typeof parsedData.EventLanguages == "string") {
      parsedData.EventLanguages = JSON.parse(parsedData.EventLanguages);
    }
  } catch (parseError) {
    return {
      error: true,
      errorMessage: "Error parsing stringified arrays of objects",
    };
  }

  const schema = Joi.object({
    TourEvent: Joi.number().valid(isTourEvent.Yes, isTourEvent.No).required(),
    EventTour_id: Joi.string().min(2),
    EventVisibility: Joi.number()
      .valid(EventVisibility.Private, EventVisibility.Public)
      .required(),
    EventType: Joi.number()
      .valid(EventType.Booking, EventType.Registration, EventType.WhatsApp)
      .required(),
    BookingPhoneNumber: Joi.string().pattern(/^\d{10}$/),
    WhatsAppPhoneNumber: Joi.string().pattern(/^\d{10}$/),
    VenueEventFlag: Joi.number()
      .valid(IsVenueAvailable.No, IsVenueAvailable.Yes)
      .required(),
    venue_id: Joi.string(),
    OnlineEventFlag: Joi.number()
      .valid(IsOnlineEvent.No, IsOnlineEvent.Yes)
      .required(),
    Online_Event_Link: Joi.string().min(5),
    VenueToBeAnnounced: Joi.number()
      .valid(EventVenueTobeAnnounced.No, EventVenueTobeAnnounced.Yes)
      .required(),
    VenueToBeAnnouncedState: Joi.string().min(2).max(555),
    VenueToBeAnnouncedStateIsoCode: Joi.string().min(2).max(20),
    VenueToBeAnnouncedCity: Joi.string().min(2).max(555),
    VenueToBeAnnouncedCityIsoCode: Joi.string().min(2).max(20),
    EventOrganizers: Joi.array()
      .min(1)
      .items(
        Joi.object({
          organizer_id: Joi.string().min(2).required(),
        })
      )
      .required(),
    EventCategories: Joi.array()
      .min(1)
      .items(
        Joi.object({
          category_id: Joi.string().min(2).required(),
        })
      )
      .required(),
    EventArtist: Joi.array()
      .min(1)
      .items(
        Joi.object({
          artist_id: Joi.string().min(2).required(),
        })
      )
      .required(),
    EventGenre: Joi.array()
      .min(1)
      .items(
        Joi.object({
          genre_id: Joi.string().min(2).required(),
        })
      )
      .required(),
    EventLanguages: Joi.array()
      .items(Joi.string().min(2).required())
      .min(1)
      .required(),
    BestSuitedFor: Joi.string().min(1),
    EventName: Joi.string().min(2).required(),
    EventDescription: Joi.string().min(2).required(),
    FeaturedEventFlag: Joi.number()
      .valid(isEventFeatured.No, isEventFeatured.Yes)
      .required(),
    EventTermsCondition: Joi.string().min(5).required(),
    EventVedioUrl: Joi.string().min(5),
    EventFAQs: Joi.array()
      .min(1)
      .items(
        Joi.object({
          Question: Joi.string().min(2).required(),
          Answer: Joi.string().min(2).required(),
        })
      ),
    ConvinienceFeeUnit: Joi.number()
      .valid(ConvinienceFeeUnit.Amount, ConvinienceFeeUnit.Percentage)
      .required(),
    ConvinienceFeeValue: Joi.number().required(),
    CreatedBy: Joi.number().valid(AdminRoles.SuperAdmin).required(),
    createduser_id: Joi.string().min(5).required(),
    Status: Joi.number()
      .valid(EventStatus.Draft, EventStatus.Published)
      .required(),
    EventDateTime: Joi.array()
      .min(1)
      .items(
        Joi.object({
          EventStartDate: Joi.string()
            .pattern(/^\d{4}-\d{2}-\d{2}$/)
            .required()
            .messages({
              "string.pattern.base": "Date must be in the format YYYY-MM-DD",
            }),
          EventStartTime: Joi.string()
            .pattern(/^\d{2}:\d{2}:\d{2}$/)
            .required()
            .messages({
              "string.pattern.base": "Time must be in the format HH:mm:ss",
            }),

          EventEndDate: Joi.string()
            .pattern(/^\d{4}-\d{2}-\d{2}$/)
            .required()
            .messages({
              "string.pattern.base": "Date must be in the format YYYY-MM-DD",
            }),
          EventEndTime: Joi.string()
            .pattern(/^\d{2}:\d{2}:\d{2}$/)
            .required()
            .messages({
              "string.pattern.base": "Time must be in the format HH:mm:ss",
            }),
        })
      )
      .required(),
  });

  try {
    const value = await schema.validateAsync(parsedData);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateSuperAdminEventUpdate(data) {
  let error = false;
  let parsedData = { ...data };
  try {
    if (typeof parsedData.EventOrganizers == "string") {
      parsedData.EventOrganizers = JSON.parse(parsedData.EventOrganizers);
    }
    if (typeof parsedData.EventCategories == "string") {
      parsedData.EventCategories = JSON.parse(parsedData.EventCategories);
    }
    if (typeof parsedData.EventArtist == "string") {
      parsedData.EventArtist = JSON.parse(parsedData.EventArtist);
    }
    if (typeof parsedData.EventGenre == "string") {
      parsedData.EventGenre = JSON.parse(parsedData.EventGenre);
    }
    if (typeof parsedData.EventFAQs == "string") {
      parsedData.EventFAQs = JSON.parse(parsedData.EventFAQs);
    }
    if (typeof parsedData.EventLanguages == "string") {
      parsedData.EventLanguages = JSON.parse(parsedData.EventLanguages);
    }
  } catch (parseError) {
    return {
      error: true,
      errorMessage: "Error parsing stringified arrays of objects",
    };
  }

  const schema = Joi.object({
    event_id: Joi.string().min(5).required(),
    TourEvent: Joi.number().valid(isTourEvent.Yes, isTourEvent.No).required(),
    EventTour_id: Joi.string().min(2),
    EventVisibility: Joi.number().valid(
      EventVisibility.Private,
      EventVisibility.Public
    ),
    EventType: Joi.number().valid(
      EventType.Booking,
      EventType.Registration,
      EventType.WhatsApp
    ),
    BookingPhoneNumber: Joi.string().pattern(/^\d{10}$/),
    WhatsAppPhoneNumber: Joi.string().pattern(/^\d{10}$/),
    VenueEventFlag: Joi.number()
      .valid(IsVenueAvailable.No, IsVenueAvailable.Yes)
      .required(),
    venue_id: Joi.string(),
    OnlineEventFlag: Joi.number()
      .valid(IsOnlineEvent.No, IsOnlineEvent.Yes)
      .required(),
    Online_Event_Link: Joi.string().min(5),
    VenueToBeAnnounced: Joi.number()
      .valid(EventVenueTobeAnnounced.No, EventVenueTobeAnnounced.Yes)
      .required(),
    VenueToBeAnnouncedState: Joi.string().min(2).max(555),
    VenueToBeAnnouncedStateIsoCode: Joi.string().min(2).max(20),
    VenueToBeAnnouncedCity: Joi.string().min(2).max(555),
    VenueToBeAnnouncedCityIsoCode: Joi.string().min(2).max(20),
    EventOrganizers: Joi.array()
      .min(1)
      .items(
        Joi.object({
          organizer_id: Joi.string().min(2).required(),
        })
      ),
    EventCategories: Joi.array()
      .min(1)
      .items(
        Joi.object({
          category_id: Joi.string().min(2).required(),
        })
      ),
    EventArtist: Joi.array()
      .min(1)
      .items(
        Joi.object({
          artist_id: Joi.string().min(2).required(),
        })
      ),
    EventGenre: Joi.array()
      .min(1)
      .items(
        Joi.object({
          genre_id: Joi.string().min(2).required(),
        })
      ),
    EventFAQs: Joi.array()
      .min(1)
      .items(
        Joi.object({
          Question: Joi.string().min(2).required(),
          Answer: Joi.string().min(2).required(),
        })
      ),
    EventLanguages: Joi.array()
      .items(Joi.string().min(2).required())
      .min(1)
      .required(),
    BestSuitedFor: Joi.string().min(1),
    EventName: Joi.string().min(2),
    EventDescription: Joi.string().min(2),
    FeaturedEventFlag: Joi.number().valid(
      isEventFeatured.No,
      isEventFeatured.Yes
    ),
    EventTermsCondition: Joi.string().min(5),
    EventVedioUrl: Joi.string().min(5),
    ConvinienceFeeUnit: Joi.number().valid(
      ConvinienceFeeUnit.Amount,
      ConvinienceFeeUnit.Percentage
    ),
    ConvinienceFeeValue: Joi.number(),
    Status: Joi.number()
      .valid(
        EventStatus.Draft,
        EventStatus.Published,
        EventStatus.ReviewRejected
      )
      .required(),
    EventRejectRemark: Joi.string().min(2),
  });

  try {
    const value = await schema.validateAsync(parsedData);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventDateTimeUpdate(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(5).max(1024).required(),
    eventDateTime_Id: Joi.string().min(5).max(1024).required(),
    EventStartDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Date must be in the format YYYY-MM-DD",
      }),
    EventStartTime: Joi.string()
      .pattern(/^\d{2}:\d{2}:\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Time must be in the format HH:mm:ss",
      }),

    EventEndDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Date must be in the format YYYY-MM-DD",
      }),
    EventEndTime: Joi.string()
      .pattern(/^\d{2}:\d{2}:\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Time must be in the format HH:mm:ss",
      }),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventDateTimeAddition(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(5).max(1024).required(),
    EventStartDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Date must be in the format YYYY-MM-DD",
      }),
    EventStartTime: Joi.string()
      .pattern(/^\d{2}:\d{2}:\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Time must be in the format HH:mm:ss",
      }),

    EventEndDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Date must be in the format YYYY-MM-DD",
      }),
    EventEndTime: Joi.string()
      .pattern(/^\d{2}:\d{2}:\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "Time must be in the format HH:mm:ss",
      }),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventDateTimeDelete(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(5).max(1024).required(),
    eventDateTime_Id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventFaqUpdate(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(5).max(1024).required(),
    eventFaq_Id: Joi.string().min(5).max(1024).required(),
    Question: Joi.string().min(2).required(),
    Answer: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventFaqDelete(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(5).max(1024).required(),
    eventFaq_Id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateAddEventFaq(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(5).max(1024).required(),
    Question: Joi.string().min(2).required(),
    Answer: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateOrganizerEventCreation(data) {
  let error = false;
  let parsedData = { ...data };
  try {
    if (typeof parsedData.EventCategories == "string") {
      parsedData.EventCategories = JSON.parse(parsedData.EventCategories);
    }
    if (typeof parsedData.EventArtist == "string") {
      parsedData.EventArtist = JSON.parse(parsedData.EventArtist);
    }
    if (typeof parsedData.EventGenre == "string") {
      parsedData.EventGenre = JSON.parse(parsedData.EventGenre);
    }
    if (typeof parsedData.EventFAQs == "string") {
      parsedData.EventFAQs = JSON.parse(parsedData.EventFAQs);
    }
    if (typeof parsedData.EventDateTime == "string") {
      parsedData.EventDateTime = JSON.parse(parsedData.EventDateTime);
    }
    if (typeof parsedData.EventLanguages == "string") {
      parsedData.EventLanguages = JSON.parse(parsedData.EventLanguages);
    }
  } catch (parseError) {
    return {
      error: true,
      errorMessage: "Error parsing stringified arrays of objects",
    };
  }

  const schema = Joi.object({
    TourEvent: Joi.number().valid(isTourEvent.No, isTourEvent.Yes).required(),
    EventTour_id: Joi.string().min(2),
    EventVisibility: Joi.number()
      .valid(EventVisibility.Private, EventVisibility.Public)
      .required(),
    EventType: Joi.number().valid(EventType.Booking).required(),
    VenueEventFlag: Joi.number()
      .valid(IsVenueAvailable.No, IsVenueAvailable.Yes)
      .required(),
    venue_id: Joi.string(),
    OnlineEventFlag: Joi.number()
      .valid(IsOnlineEvent.No, IsOnlineEvent.Yes)
      .required(),
    Online_Event_Link: Joi.string().min(5),
    VenueToBeAnnounced: Joi.number()
      .valid(EventVenueTobeAnnounced.No, EventVenueTobeAnnounced.Yes)
      .required(),
    VenueToBeAnnouncedState: Joi.string().min(2).max(20),
    VenueToBeAnnouncedStateIsoCode: Joi.string().min(2).max(20),
    VenueToBeAnnouncedCity: Joi.string().min(2).max(20),
    VenueToBeAnnouncedCityIsoCode: Joi.string().min(2).max(20),
    EventCategories: Joi.array()
      .min(1)
      .items(
        Joi.object({
          category_id: Joi.string().min(2).required(),
        })
      )
      .required(),
    EventArtist: Joi.array()
      .min(1)
      .items(
        Joi.object({
          artist_id: Joi.string().min(2).required(),
        })
      )
      .required(),
    EventGenre: Joi.array()
      .min(1)
      .items(
        Joi.object({
          genre_id: Joi.string().min(2).required(),
        })
      )
      .required(),
    EventLanguages: Joi.array()
      .items(Joi.string().min(2).required())
      .min(1)
      .required(),
    BestSuitedFor: Joi.string().min(1),
    EventName: Joi.string().min(2).required(),
    EventDescription: Joi.string().min(2).required(),
    EventTermsCondition: Joi.string().min(5).required(),
    EventVedioUrl: Joi.string().min(5),
    EventFAQs: Joi.array()
      .min(1)
      .items(
        Joi.object({
          Question: Joi.string().min(2).required(),
          Answer: Joi.string().min(2).required(),
        })
      ),
    CreatedBy: Joi.number().valid(AdminRoles.Organizer).required(),
    createduser_id: Joi.string().min(5).required(),
    Status: Joi.number()
      .valid(EventStatus.Draft, EventStatus.InReview)
      .required(),
    EventDateTime: Joi.array()
      .min(1)
      .items(
        Joi.object({
          EventStartDate: Joi.string().required(),
          EventStartTime: Joi.string().required(),
          EventEndDate: Joi.string().required(),
          EventEndTime: Joi.string().required(),
        })
      )
      .required(),
  });

  try {
    const value = await schema.validateAsync(parsedData);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateOrganizerEventUpdate(data) {
  let error = false;
  let parsedData = { ...data };
  try {
    if (typeof parsedData.EventCategories == "string") {
      parsedData.EventCategories = JSON.parse(parsedData.EventCategories);
    }
    if (typeof parsedData.EventArtist == "string") {
      parsedData.EventArtist = JSON.parse(parsedData.EventArtist);
    }
    if (typeof parsedData.EventGenre == "string") {
      parsedData.EventGenre = JSON.parse(parsedData.EventGenre);
    }
    if (typeof parsedData.EventFAQs == "string") {
      parsedData.EventFAQs = JSON.parse(parsedData.EventFAQs);
    }
    if (typeof parsedData.EventLanguages == "string") {
      parsedData.EventLanguages = JSON.parse(parsedData.EventLanguages);
    }
  } catch (parseError) {
    return {
      error: true,
      errorMessage: "Error parsing stringified arrays of objects",
    };
  }

  const schema = Joi.object({
    event_id: Joi.string().min(5).required(),
    EventVisibility: Joi.number().valid(
      EventVisibility.Private,
      EventVisibility.Public
    ),
    BookingPhoneNumber: Joi.string().pattern(/^\d{10}$/),
    VenueEventFlag: Joi.number()
      .valid(IsVenueAvailable.No, IsVenueAvailable.Yes)
      .required(),
    venue_id: Joi.string(),
    OnlineEventFlag: Joi.number()
      .valid(IsOnlineEvent.No, IsOnlineEvent.Yes)
      .required(),
    Online_Event_Link: Joi.string().min(5),
    VenueToBeAnnounced: Joi.number()
      .valid(EventVenueTobeAnnounced.No, EventVenueTobeAnnounced.Yes)
      .required(),
    VenueToBeAnnouncedState: Joi.string().min(2).max(20),
    VenueToBeAnnouncedStateIsoCode: Joi.string().min(2).max(20),
    VenueToBeAnnouncedCity: Joi.string().min(2).max(20),
    VenueToBeAnnouncedCityIsoCode: Joi.string().min(2).max(20),
    EventCategories: Joi.array()
      .min(1)
      .items(
        Joi.object({
          category_id: Joi.string().min(2).required(),
        })
      ),
    EventArtist: Joi.array()
      .min(1)
      .items(
        Joi.object({
          artist_id: Joi.string().min(2).required(),
        })
      ),
    EventGenre: Joi.array()
      .min(1)
      .items(
        Joi.object({
          genre_id: Joi.string().min(2).required(),
        })
      ),
    EventFAQs: Joi.array()
      .min(1)
      .items(
        Joi.object({
          Question: Joi.string().min(2).required(),
          Answer: Joi.string().min(2).required(),
        })
      ),
    EventLanguages: Joi.array()
      .items(Joi.string().min(2).required())
      .min(1)
      .required(),
    EventLanguage: Joi.string().min(2),
    BestSuitedFor: Joi.string().min(1),
    EventName: Joi.string().min(2),
    EventTag_id: Joi.string().min(2),
    EventTour_id: Joi.string().min(2),
    EventDescription: Joi.string().min(2),
    EventTermsCondition: Joi.string().min(5),
    EventVedioUrl: Joi.string().min(5),
    Status: Joi.number()
      .valid(EventStatus.Draft, EventStatus.InReview)
      .required(),
  });

  try {
    const value = await schema.validateAsync(parsedData);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateUserForData(data) {
  let error = false;
  const schema = Joi.object({
    AdminRole: Joi.number()
      .valid(
        AdminRoles.Employee,
        AdminRoles.Organizer,
        AdminRoles.Promoter,
        AdminRoles.SuperAdmin
      )
      .required(),
    user_id: Joi.string().min(5).required(),
    eventNameSearchKeyword: Joi.string().min(3),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    CityName: Joi.string().min(2),
    organizer_id: Joi.string().min(5),
    venue_id: Joi.string().min(5),
    promoter_id: Joi.string().min(5),
    page: Joi.string().min(1),
    limit: Joi.string().min(1),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateAddPromoterToEvent(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(2).required(),
    promoterIds: Joi.array().items(Joi.string()).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTagCreation(data) {
  let error = false;
  const schema = Joi.object({
    EventTagName: Joi.string().min(3).max(50).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTagDataUpdate(data) {
  let error = false;
  const schema = Joi.object({
    EventTagName: Joi.string().min(3).max(50),
    EventTag_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventCarouselImageDelete(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(2).required(),
    image_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventCarouselImageUpload(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventGalleryImageDelete(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(2).required(),
    image_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventGalleryImageUpload(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTicketCreation(data) {
  let error = false;
  const schema = Joi.object({
    Event_id: Joi.string().min(3).max(50).required(),
    EventTicketType: Joi.number()
      .valid(
        TicketType.MultipleDay,
        TicketType.SeasonPass,
        TicketType.SingleDay
      )
      .required(),
    EventDateTimeIds: Joi.array()
      .min(1)
      .items(
        Joi.object({
          eventDateTime_id: Joi.string().min(2).required(),
        })
      ),
    EventTicketVisibility: Joi.number()
      .valid(
        TicketVisiblity.All,
        TicketVisiblity.AllCustomers,
        TicketVisiblity.Promoters
      )
      .required(),
    EventPromoters: Joi.array()
      .min(1)
      .items(
        Joi.object({
          promoter_id: Joi.string().min(2).required(),
        })
      ),
    Name: Joi.string().min(1).max(50).required(),
    Description: Joi.string().min(3).max(10000),
    Price: Joi.number().min(0).required(),
    Quantity: Joi.number().integer().positive().required(),
    BookingMaxLimit: Joi.number().integer().positive().required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTicketUpdate(data) {
  let error = false;
  const schema = Joi.object({
    Event_id: Joi.string().min(3).max(50).required(),
    eventTicket_id: Joi.string().min(3).max(50).required(),
    EventTicketVisibility: Joi.number().valid(
      TicketVisiblity.All,
      TicketVisiblity.AllCustomers,
      TicketVisiblity.Promoters,
      TicketVisiblity.Self
    ),
    Description: Joi.string().min(3).max(10000),
    Quantity: Joi.number().integer().positive(),
    Price: Joi.number().min(0),
    BookingMaxLimit: Joi.number().integer().positive(),
    EventPromoters: Joi.array()
      .min(1)
      .items(
        Joi.object({
          promoter_id: Joi.string().min(2).required(),
        })
      ),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validatePromoterEventTicketsByEventDates(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(3).max(50).required(),
    eventDateTime_id: Joi.string().min(3).max(50).required(),
    promoter_id: Joi.string().min(3).max(50).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTicketsBookingByPromoter(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(3).max(50).required(),
    EventTicketType: Joi.number()
      .valid(
        TicketType.MultipleDay,
        TicketType.SeasonPass,
        TicketType.SingleDay
      )
      .required(),
    EventDateTime_id: Joi.string().min(3).max(50),
    EventTicket_id: Joi.string().min(3).max(50).required(),
    CustomerName: Joi.string().min(3).max(50).required(),
    PhoneNumber: Joi.string()
      .pattern(/^\d{10}$/)
      .required(),
    isWhatsAppNumberisSame: Joi.number().valid(0, 1),
    WhatsAppNumber: Joi.string().pattern(/^\d{10}$/),
    Email: Joi.string().email().min(4).max(1024).required(),
    CustomerAge: Joi.number().integer().positive(),
    TicketQuantity: Joi.number().integer().positive().required(),
    PromoterNote: Joi.string().min(3).max(500),
    promoter_id: Joi.string().min(3).max(500).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventBookingsbyPromoterId(data) {
  let error = false;
  const schema = Joi.object({
    promoter_id: Joi.string().min(3).max(500).required(),
    event_id: Joi.string().min(3).max(500).required(),
    eventDateTime_id: Joi.string().min(3).max(500),
    ticketName: Joi.string().min(3).max(500),
    searchKeyword: Joi.string().min(3).max(500),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validatePromoterLatestBookingsbyPromoterId(data) {
  let error = false;
  const schema = Joi.object({
    promoter_id: Joi.string().min(3).max(500).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validatePromoterLatestBookingsForSuperAdminOrganizer(data) {
  let error = false;
  const schema = Joi.object({
    searchkeyword: Joi.string().min(3).max(500),
    cityname: Joi.string().min(3).max(500),
    venue_id: Joi.string().min(3).max(500),
    organizer_id: Joi.string().min(3).max(500),
    promoter_id: Joi.string().min(3).max(500),
    event_id: Joi.string().min(3).max(500),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    AdminRole: Joi.number()
      .valid(
        AdminRoles.Employee,
        AdminRoles.Organizer,
        AdminRoles.Promoter,
        AdminRoles.SuperAdmin
      )
      .required(),
    user_id: Joi.string().min(5).required(),
    page: Joi.string().min(1).required(),
    limit: Joi.string().min(1).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateOnlineLatestBookingsForSuperAdminOrganizer(data) {
  let error = false;
  const schema = Joi.object({
    searchkeyword: Joi.string().min(3).max(500),
    cityname: Joi.string().min(3).max(500),
    venue_id: Joi.string().min(3).max(500),
    organizer_id: Joi.string().min(3).max(500),
    event_id: Joi.string().min(3).max(500),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    AdminRole: Joi.number()
      .valid(
        AdminRoles.Employee,
        AdminRoles.Organizer,
        AdminRoles.Promoter,
        AdminRoles.SuperAdmin
      )
      .required(),
    user_id: Joi.string().min(5).required(),
    page: Joi.string().min(1).required(),
    limit: Joi.string().min(1).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateAllLatestBookingsForSuperAdminOrganizer(data) {
  let error = false;
  const schema = Joi.object({
    searchkeyword: Joi.string().min(3).max(500),
    cityname: Joi.string().min(3).max(500),
    venue_id: Joi.string().min(3).max(500),
    organizer_id: Joi.string().min(3).max(500),
    promoter_id: Joi.string().min(3).max(500),
    event_id: Joi.string().min(3).max(500),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    AdminRole: Joi.number()
      .valid(
        AdminRoles.Employee,
        AdminRoles.Organizer,
        AdminRoles.Promoter,
        AdminRoles.SuperAdmin
      )
      .required(),
    user_id: Joi.string().min(5).required(),
    page: Joi.string().min(1).required(),
    limit: Joi.string().min(1).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateSmtpDetails(data) {
  let error = false;
  const schema = Joi.object({
    Port: Joi.number().integer().min(1),
    Host: Joi.string().min(2),
    Username: Joi.string().min(2),
    Password: Joi.string().min(2),
    Encryption: Joi.string().min(2),
    smtp_id: Joi.string().min(2),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateWebsiteLead(data) {
  let error = false;
  const schema = Joi.object({
    FullName: Joi.string().min(2),
    Email: Joi.string().email().min(4).max(1024).required(),
    Position: Joi.string().min(2),
    City: Joi.string().min(2),
    CompanyName: Joi.string().min(2),
    PhoneNumber: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10)
      .required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTourCreation(data) {
  let error = false;
  const schema = Joi.object({
    Name: Joi.string().min(5).max(50).required(),
    Description: Joi.string().min(0).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTourDataUpdate(data) {
  let error = false;
  const schema = Joi.object({
    Name: Joi.string().min(5).max(50),
    Description: Joi.string().min(0).max(1024),
    eventTour_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTourImageDelete(data) {
  let error = false;
  const schema = Joi.object({
    eventTour_id: Joi.string().min(2).required(),
    image_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTourImageUpload(data) {
  let error = false;
  const schema = Joi.object({
    eventTour_id: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventNameSearchKeyword(data) {
  let error = false;
  const schema = Joi.object({
    AdminRole: Joi.number()
      .valid(
        AdminRoles.Employee,
        AdminRoles.Organizer,
        AdminRoles.Promoter,
        AdminRoles.SuperAdmin
      )
      .required(),
    user_id: Joi.string().min(5).required(),
    Event_Status: Joi.number()
      .valid(
        EventStatus.Completed,
        EventStatus.Draft,
        EventStatus.Published,
        EventStatus.InReview,
        EventStatus.ReviewApproved,
        EventStatus.ReviewRejected
      )
      .required(),
    search_keyword: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateSearchQuery(data) {
  let error = false;
  const schema = Joi.object({
    search_keyword: Joi.string().min(2).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateBulkTicketBooking(data) {
  let error = false;
  const schema = Joi.object({
    event_id: Joi.string().min(5).max(50).required(),
    TicketName: Joi.string().min(2).max(50).required(),
    CustomerName: Joi.string().min(2).max(50).required(),
    PhoneNumber: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10)
      .required(),
    Email: Joi.string().email().min(4).max(1024).required(),
    EventDateTime_id: Joi.string().min(5).max(50).required(),
    Quantity: Joi.number().integer().positive().greater(0).required(),
    Price: Joi.number().min(0).required(),
    CreatedBy: Joi.number().valid(AdminRoles.SuperAdmin).required(),
    createduser_id: Joi.string().min(5).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateCustomerRegistrationBySuperAdmin(data) {
  let error = false;
  const schema = Joi.object({
    Email: Joi.string().email().min(4).max(1024).required(),
    CustomerName: Joi.string().min(5).max(50).required(),
    MobileNumber: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10)
      .required(),
    createduser_id: Joi.string().min(5).max(50).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateGenrateOtpForWebsiteUsers(data) {
  let error = false;
  const schema = Joi.object({
    MobileNumber: Joi.string()
      .pattern(new RegExp(/^\d{10}$/))
      .min(10)
      .max(10)
      .required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateOtpForWebsiteUsers(data) {
  let error = false;
  const schema = Joi.object({
    customer_id: Joi.string().min(5).max(10000).required(),
    Otp: Joi.string()
      .pattern(new RegExp(/^\d{6}$/))
      .min(6)
      .max(6)
      .required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateWebsiteUsersProfileUpdate(data) {
  let error = false;
  const schema = Joi.object({
    customer_id: Joi.string().min(5).max(10000).required(),
    Email: Joi.string().email().min(4).max(1024),
    CustomerName: Joi.string().min(2).max(50),
    Identity: Joi.string().min(3).max(10),
    AddressLine1: Joi.string().min(5).max(200),
    AddressLine2: Joi.string().min(5).max(200),
    Landmark: Joi.string().min(5).max(200),
    City: Joi.string().min(5).max(50),
    State: Joi.string().min(5).max(50),
    Pincode: Joi.string().min(5).max(50),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventsReportsData(data) {
  let error = false;
  const schema = Joi.object({
    AdminRole: Joi.number()
      .valid(
        AdminRoles.Employee,
        AdminRoles.Organizer,
        AdminRoles.Promoter,
        AdminRoles.SuperAdmin
      )
      .required(),
    user_id: Joi.string().min(5).required(),
    eventNameSearchKeyword: Joi.string().min(3).required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required(),
    EventReportType: Joi.number()
      .valid(ReportType.SummaryBooking, ReportType.TransactionBooking)
      .required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventBookingsForSuperAdminOrganizer(data) {
  let error = false;
  const schema = Joi.object({
    AdminRole: Joi.number()
      .valid(AdminRoles.Organizer, AdminRoles.SuperAdmin)
      .required(),
    user_id: Joi.string().min(5).required(),
    event_id: Joi.string().min(3).max(500).required(),
    eventDateTime_id: Joi.string().min(3).max(500),
    ticketName: Joi.string().min(3).max(500),
    searchKeyword: Joi.string().min(3).max(500),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateCategoryEventsData(data) {
  let error = false;
  const schema = Joi.object({
    category_id: Joi.string().min(5).required(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    LanguageName: Joi.string().min(2),
    Genre_id: Joi.string().min(2),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventsDataFilter(data) {
  let error = false;
  const schema = Joi.object({
    category_id: Joi.string().min(5),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    LanguageName: Joi.string().min(2),
    Genre_id: Joi.string().min(2),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validaterRegisterScannerUser(data) {
  let error = false;
  const schema = Joi.object({
    Username: Joi.string().min(5).max(50).required(),
    Password: Joi.string().min(5).max(10).required(),
    UserType: Joi.number()
      .valid(ScannerUserType.Event, ScannerUserType.Organizer)
      .required(),
    Events: Joi.array()
      .min(1)
      .items(
        Joi.object({
          event_id: Joi.string().min(2).required(),
        })
      ),
    Organizers: Joi.array()
      .min(1)
      .items(
        Joi.object({
          organizer_id: Joi.string().min(2).required(),
        })
      ),
    CreatedBy: Joi.number()
      .valid(AdminRoles.SuperAdmin, AdminRoles.Employee, AdminRoles.Organizer)
      .required(),
    createduser_id: Joi.string().min(5).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateScannerUserLogin(data) {
  let error = false;
  const schema = Joi.object({
    Username: Joi.string().min(5).max(1024).required(),
    Password: Joi.string().min(5).max(10).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateScannerUserUpdate(data) {
  let error = false;
  const schema = Joi.object({
    UserType: Joi.number()
      .valid(ScannerUserType.Event, ScannerUserType.Organizer)
      .required(),
    Events: Joi.array()
      .min(1)
      .items(
        Joi.object({
          event_id: Joi.string().min(2).required(),
        })
      ),
    Organizers: Joi.array()
      .min(1)
      .items(
        Joi.object({
          organizer_id: Joi.string().min(2).required(),
        })
      ),
    scanneruser_id: Joi.string().min(5).max(1024).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateQrCodeDetails(data) {
  let error = false;
  const schema = Joi.object({
    scanneruser_id: Joi.string().min(5).max(500).required(),
    event_id: Joi.string().min(5).max(500).required(),
    Booking_id: Joi.string().min(6).max(6).required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validatePromocodeCreation(data) {
  let error = false;
  const schema = Joi.object({
    CanBeUsed: Joi.number()
      .valid(
        PromocodeCanbeUsedIn.AllEvents,
        PromocodeCanbeUsedIn.SpecificEvents
      )
      .required(),
    Events: Joi.array()
      .items(
        Joi.object({
          event_id: Joi.string().min(2).required(),
        })
      )
      .min(1)
      .optional(),
    PromoCodeName: Joi.string().min(6).max(12).required(),
    TermsCondition: Joi.string().min(5).max(1024),
    PromocodeType: Joi.number()
      .valid(PromocodeUnit.Amount, PromocodeUnit.Percentage)
      .required(),
    Value: Joi.number().positive().greater(0).required(),
    MinCheckoutAmount: Joi.number().positive().greater(0).required(),
    ExpiryDate: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "ExpiryDate must be in the format YYYY-MM-DD",
      }),
    OneTimeUseFlag: Joi.number()
      .valid(
        PromocodeOneTimePerCustomerFlag.No,
        PromocodeOneTimePerCustomerFlag.Yes
      )
      .required(),
    PromocodeValidFor: Joi.number()
      .valid(PromocodeValid.Public, PromocodeValid.Private)
      .required(),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

async function validateEventTicketsBookingByWebsite(data) {
  let error = false;
  const schema = Joi.object({
    customer_id: Joi.string().min(3).max(50).required(),
    event_id: Joi.string().min(3).max(50).required(),
    EventTicket_id: Joi.string().min(3).max(50).required(),
    TicketQuantity: Joi.number().integer().positive().required(),
    Promocode_id: Joi.string().min(3).max(50),
    customer_Address: Joi.string().min(3).max(50),
    customer_Pincode: Joi.string().min(3).max(50),
    customer_Country: Joi.string().min(1).max(50),
    customer_CountryIsoCode: Joi.string().min(1).max(50),
    customer_State: Joi.string().min(1).max(50),
    customer_StateIsoCode: Joi.string().min(1).max(50),
    customer_City: Joi.string().min(1).max(50),
    customer_CityIsoCode: Joi.string().min(1).max(50),
  });

  try {
    const value = await schema.validateAsync(data);
    return { error, value };
  } catch (err) {
    error = true;
    let errorMessage = err.details[0].message;
    return { error, errorMessage };
  }
}

export {
  validateArtistRegistration,
  validateArtistDataUpdate,
  validateImageDelete,
  validateArtistImageUpload,
  validateCategoryCreation,
  validateCategoryDataUpdate,
  validateCategoryImageDelete,
  validateCategoryImageUpload,
  validateVenueCreation,
  validateVenueUpdateData,
  validateVenueImageDelete,
  validateVenueImageUpload,
  validateGenreCreation,
  validateGenreDataUpdate,
  validateGenreImageDelete,
  validateGenreImageUpload,
  validateFaqCreation,
  validateAddEventFaq,
  validateFaqDataUpdate,
  validateSuperAdmin,
  validateChangePassword,
  validateSuperAdminProfileUpdate,
  validaterRegisterOrganizer,
  validateOrganizerLogin,
  validateOrganizerProfileUpdate,
  validaterRegisterPromoter,
  validatePromoterLogin,
  validatePromoterProfileUpdate,
  validateResetPasswordEmail,
  validateResetPasswordData,
  validateSuperAdminEventCreation,
  validateSuperAdminEventUpdate,
  validateEventDateTimeAddition,
  validateEventDateTimeDelete,
  validateEventDateTimeUpdate,
  validateEventFaqUpdate,
  validateEventFaqDelete,
  validateOrganizerEventCreation,
  validateOrganizerEventUpdate,
  validateUserForData,
  validateAddPromoterToEvent,
  validateEventTagCreation,
  validateEventTagDataUpdate,
  validateEventCarouselImageDelete,
  validateEventCarouselImageUpload,
  validateEventGalleryImageDelete,
  validateEventGalleryImageUpload,
  validateEventTicketCreation,
  validateEventTicketUpdate,
  validatePromoterEventTicketsByEventDates,
  validateEventTicketsBookingByPromoter,
  validateEventBookingsbyPromoterId,
  validatePromoterLatestBookingsbyPromoterId,
  validatePromoterLatestBookingsForSuperAdminOrganizer,
  validateOnlineLatestBookingsForSuperAdminOrganizer,
  validateAllLatestBookingsForSuperAdminOrganizer,
  validateSmtpDetails,
  validateEventTourCreation,
  validateEventTourDataUpdate,
  validateEventTourImageDelete,
  validateEventTourImageUpload,
  validateEventNameSearchKeyword,
  validateSearchQuery,
  validateBulkTicketBooking,
  validateCustomerRegistrationBySuperAdmin,
  validateGenrateOtpForWebsiteUsers,
  validateOtpForWebsiteUsers,
  validateWebsiteUsersProfileUpdate,
  validateEventsReportsData,
  validateEventBookingsForSuperAdminOrganizer,
  validateCategoryEventsData,
  validateEventsDataFilter,
  validaterRegisterScannerUser,
  validateScannerUserLogin,
  validateScannerUserUpdate,
  validateQrCodeDetails,
  validatePromocodeCreation,
  validateEventTicketsBookingByWebsite,
  validateWebsiteLead,
};
