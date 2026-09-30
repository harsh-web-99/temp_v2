import sendResponse from "../../../helpers/sendResponse.js";
import {
  PromocodeCanbeUsedIn,
  PromocodeUnit,
  PromocodeOneTimePerCustomerFlag,
  PromocodeValid,
  EventStatus,
  Status,
  PromocodeStatus,
  BookingStatus,
} from "../../../helpers/Enum.js";
import {
  getPromocodeDataService,
  findOnePromocodeDataService,
} from "../../../services/PromocodeServices.js";
import {
  getEventDataService,
  findOneEventDataService,
} from "../../../services/EventServices.js";
import { findOneCustomerDataService } from "../../../services/CustomerServices.js";
import { findOneEventBookingsDataService } from "../../../services/EventBookingServices.js";

const getPromocodesforWebsite = async (req, res) => {
  try {
    console.log("Get Promocode for Validation API Called");
    console.log("Request Body: ", req.body);

    const { event_id, customer_id } = req.body;

    if (!event_id) return sendResponse(res, 404, true, "Provide Event Id");
    if (!customer_id)
      return sendResponse(res, 404, true, "Provide Customer Id");

    const isCustomerExists = await findOneCustomerDataService({
      _id: customer_id,
      status: Status.Active,
    });

    if (!isCustomerExists)
      return sendResponse(res, 404, true, "Customer Not Found");

    const isEventExists = await findOneEventDataService({ _id: event_id ,EventStatus:EventStatus.Published});

    if (!isEventExists) return sendResponse(res, 404, true, "Event Not Found");

    const allPromocodes = await getPromocodeDataService({
      status: PromocodeStatus.Active,
      PromocodeValidFor: PromocodeValid.Public,
    });

    if (allPromocodes.length === 0)
      return sendResponse(res, 404, true, "No Active Promocodes Found for Website");

    const filteredActivePromocodes = [];

    for (const promocode of allPromocodes) {
      const {
        _id,
        CanBeUsed,
        Events,
        TermsCondition,
        Value,
        PromocodeType,
        MinCheckoutAmount,
        OneTimeUseFlag,
        PromoCodeName
      } = promocode;

      // Check if the promocode is one-time use per customer
      if (OneTimeUseFlag == PromocodeOneTimePerCustomerFlag.Yes) {
        const IsPromocodeAlreadyUsed = await findOneEventBookingsDataService({
          customer_id: customer_id,
          Promocode_id: _id,
          status: BookingStatus.Booked,
        });
        if (IsPromocodeAlreadyUsed) continue; // Skip if already used
      }

      if (CanBeUsed == PromocodeCanbeUsedIn.AllEvents) {
        // Valid for all events
        filteredActivePromocodes.push({
          _id,
          PromoCodeName,
          TermsCondition,
          MinAmount: MinCheckoutAmount,
          PromType: PromocodeType,
          Value,
        });
        continue;
      }

      if (CanBeUsed == PromocodeCanbeUsedIn.SpecificEvents) {
        // Valid for specific events, check if event_id is in Events array
        if (Array.isArray(Events) && Events.some(e => e.event_id === event_id)) {
          filteredActivePromocodes.push({
            _id,
            PromoCodeName,
            TermsCondition,
            MinAmount: MinCheckoutAmount,
            PromType: PromocodeType,
            Value,
          });
        }
      }
    }

    if (filteredActivePromocodes.length === 0)
      return sendResponse(res, 404, true, "No valid promocodes available for this customer");

    return sendResponse(res, 200, false, "Valid Promocodes", filteredActivePromocodes);
  } catch (error) {
    console.error("Error in validating Promocode:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

const applyPromocodeForWebsite = async (req, res) => {
  try {

    const { event_id, customer_id, promocode_name, amount } = req.body;

    if (!event_id) return sendResponse(res, 404, true, "Provide Event Id");
    if (!customer_id) return sendResponse(res, 404, true, "Provide Customer Id");
    if (!promocode_name) return sendResponse(res, 404, true, "Provide Promocode Name");
    if (amount === undefined || amount === null) return sendResponse(res, 404, true, "Provide Amount");

    // Check customer existence and status
    const isCustomerExists = await findOneCustomerDataService({
      _id: customer_id,
      status: Status.Active,
    });
    if (!isCustomerExists) return sendResponse(res, 404, true, "Customer Not Found");

    // Check event existence and published status
    const isEventExists = await findOneEventDataService({ _id: event_id, EventStatus: EventStatus.Published });
    if (!isEventExists) return sendResponse(res, 404, true, "Event Not Found");

    // Find promocode by name (active, public or private)
    const promocode = await findOnePromocodeDataService({
      status: PromocodeStatus.Active,
      PromoCodeName: promocode_name.trim(),
    });
    if (!promocode) return sendResponse(res, 404, true, "Invalid or Expired Promocode");

    const {
      _id,
      CanBeUsed,
      Events,
      TermsCondition,
      Value,
      PromocodeType,
      MinCheckoutAmount,
      OneTimeUseFlag,
      PromoCodeName
    } = promocode;


    // Check if the promocode is one-time use per customer
    if (OneTimeUseFlag == PromocodeOneTimePerCustomerFlag.Yes) {
      const IsPromocodeAlreadyUsed = await findOneEventBookingsDataService({
        customer_id: customer_id,
        Promocode_id: _id,
        status: BookingStatus.Booked,
      });
      if (IsPromocodeAlreadyUsed) return sendResponse(res, 400, true, "Promocode already used");
    }

    // Check minimum checkout amount
    if (amount < MinCheckoutAmount) {
      return sendResponse(res, 400, true, `Minimum checkout amount to use this promocode is ${MinCheckoutAmount}`);
    }

    // Check CanBeUsed logic
    if (CanBeUsed == PromocodeCanbeUsedIn.AllEvents) {
      // Valid for all events
      return sendResponse(res, 200, false, "Valid Promocode", {
        _id,
        PromoCodeName,
        TermsCondition,
        MinAmount: MinCheckoutAmount,
        PromType: PromocodeType,
        Value,
      });
    }

    if (CanBeUsed == PromocodeCanbeUsedIn.SpecificEvents) {
      // Valid for specific events, check if event_id is in Events array
      if (Array.isArray(Events) && Events.some(e => e.event_id === event_id)) {
        return sendResponse(res, 200, false, "Valid Promocode", {
          _id,
          PromoCodeName,
          TermsCondition,
          MinAmount: MinCheckoutAmount,
          PromType: PromocodeType,
          Value,
        });
      } else {
        return sendResponse(res, 400, true, "Promocode not valid for this event");
      }
    }

    // If none of the above, invalid usage
    return sendResponse(res, 400, true, "Promocode cannot be applied");
  } catch (error) {
    console.error("Error in validating Promocode:", error);
    return sendResponse(res, 500, true, "Internal Server Error");
  }
};

export { getPromocodesforWebsite, applyPromocodeForWebsite};
