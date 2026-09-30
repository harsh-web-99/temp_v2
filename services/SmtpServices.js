import { Smtp } from "../models/AllModels.js";

const registerSmtpService = async (SMTPData) => {
  try {
    const newSmtpDetails = new Smtp(SMTPData);
    await newSmtpDetails.save();
    return newSmtpDetails;
  } catch (error) {
    console.error("Error registering SMTP:", error);
    throw new Error("Failed to register SMTP");
  }
};

const getSmtpDetailsService = async (filterquery) => {
  try {
    const SmtpData = await Smtp.find(filterquery);
    return SmtpData;
  } catch (error) {
    console.error("Error finding fetching Smtp Data:", error);
    throw new Error("Failed to Finding fetching Smtp Data");
  }
};

const findOneSmtpDataService = async (filterquery) => {
  try {
    const SmtpData = await Smtp.findOne(filterquery);
    return SmtpData;
  } catch (error) {
    console.error("Error finding One Smtp Data:", error);
    throw new Error("Failed to Finding One Smtp Data");
  }
};

const updateSmtpDetailsService = async (filterquery, updateQuery) => {
  try {
    const SmtpData = await Smtp.findByIdAndUpdate(filterquery, updateQuery);
    return SmtpData;
  } catch (error) {
    console.error("Error updating Smtp Data:", error);
    throw new Error("Failed to update Smtp Data");
  }
};

export {
  registerSmtpService,
  getSmtpDetailsService,
  findOneSmtpDataService,
  updateSmtpDetailsService,
};
