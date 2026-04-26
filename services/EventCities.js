import { EventCity } from "../models/AllModels.js";

const createEventCitiesService = async (eventCityData) => {
  try {
    const newEventCity = new EventCity(eventCityData);
    await newEventCity.save();
    return newEventCity;
  } catch (error) {
    console.error("Error creating Event City:", error);
    throw new Error("Failed to create Event City");
  }
};

const findOneEventCitiesDataService = async (filterquery) => {
  try {
    const EventCityData = await EventCity.findOne(filterquery);
    return EventCityData;
  } catch (error) {
    console.error("Error finding One Event City:", error);
    throw new Error("Failed to Finding One Event City");
  }
};

const getEventCitiesDataService = async (filterquery) => {
  try {
    const EventCitiesData = await EventCity.find(filterquery);
    return EventCitiesData;
  } catch (error) {
    console.error("Error finding fetching Event City Data:", error);
    throw new Error("Failed to Finding fetching Event City Data");
  }
};

const getEventCitiesByIdService = async (eventCity_id) => {
  try {
    const EventCityData = await EventCity.findById(eventCity_id);
    return EventCityData;
  } catch (error) {
    console.error("Error finding fetching Event City Data by Id:", error);
    throw new Error("Failed to Finding fetching Event City Data by Id");
  }
};

const getPaginatedEventCityData = async (filterQuery, limit, skip) => {
  try {
    return await EventCity.find(filterQuery).limit(limit).skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated EventCity Data:", error);
    throw error;
  }
};

const countEventCity = async (filterQuery) => {
  try {
    return await EventCity.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting EventCity Data:", error);
    throw error;
  }
};

export {
  createEventCitiesService,
  findOneEventCitiesDataService,
  getEventCitiesDataService,
  getEventCitiesByIdService,
  getPaginatedEventCityData,
  countEventCity,
};
