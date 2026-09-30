import { WebsiteLeads } from "../models/AllModels.js";

const insertWebsiteLeadService = async (SMTPData) => {
  try {
    const newWebsiteLead = new WebsiteLeads(SMTPData);
    await newWebsiteLead.save();
    return newWebsiteLead;
  } catch (error) {
    console.error("Error inserting new Website Lead:", error);
    throw new Error("Failed to inserting new Website Lead");
  }
};

const getWebsiteLeadsService = async (filterquery) => {
  try {
    const WebsiteLeads = await WebsiteLeads.find(filterquery);
    return WebsiteLeads;
  } catch (error) {
    console.error("Error finding fetching WebsiteLeads Data:", error);
    throw new Error("Failed to Finding fetching WebsiteLeads Data");
  }
};

const findOneWebsiteLead = async (filterquery) => {
  try {
    const WebsiteLead = await WebsiteLeads.findOne(filterquery);
    return WebsiteLead;
  } catch (error) {
    console.error("Error finding One WebsiteLeads Data:", error);
    throw new Error("Failed to Finding One WebsiteLeads Data");
  }
};

const getPaginatedWebsiteLeadsData = async (filterQuery, limit, skip) => {
  try {
    return await WebsiteLeads.find(filterQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated WebsiteLeads Data:", error);
    throw error;
  }
};

const countWebsiteLeads = async (filterQuery) => {
  try {
    return await WebsiteLeads.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting WebsiteLeads Data:", error);
    throw error;
  }
};

export {
  insertWebsiteLeadService,
  getWebsiteLeadsService,
  findOneWebsiteLead,
  getPaginatedWebsiteLeadsData,
  countWebsiteLeads,
};
