import { EventTickets } from "../models/AllModels.js";
import { getSmtpDetailsService } from "../services/SmtpServices.js";

import puppeteer from "puppeteer";
import ejs from "ejs";
import QRCode from "qrcode";
import archiver from "archiver";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { promisify } from "util";
import { pipeline } from "stream";
const asyncPipeline = promisify(pipeline);

const createEventTicketService = async (eventTicketData) => {
  try {
    const newEventTicket = new EventTickets(eventTicketData);
    await newEventTicket.save();
    return newEventTicket;
  } catch (error) {
    console.error("Error creating EventTicket:", error);
    throw new Error("Failed to create EventTicket");
  }
};

const findOneEventTicketDataService = async (filterquery) => {
  try {
    const EventTicketData = await EventTickets.findOne(filterquery);
    return EventTicketData;
  } catch (error) {
    console.error("Error finding One EventTicket:", error);
    throw new Error("Failed to Finding One EventTicket");
  }
};

const getEventTicketDataService = async (filterquery) => {
  try {
    const EventTicketsData = await EventTickets.find(filterquery);
    return EventTicketsData;
  } catch (error) {
    console.error("Error finding fetching EventTicket Data:", error);
    throw new Error("Failed to Finding fetching EventTicket Data");
  }
};

const getPaginatedEventTicketsData = async (filterQuery, limit, skip) => {
  try {
    return await EventTickets.find(filterQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    console.error("Error in fetching paginated EventTickets Data:", error);
    throw error;
  }
};

const countEventTickets = async (filterQuery) => {
  try {
    return await EventTickets.countDocuments(filterQuery);
  } catch (error) {
    console.error("Error in counting EventTickets Data:", error);
    throw error;
  }
};

const getEventTicketByIdService = async (event_id) => {
  try {
    const EventTicketData = await EventTickets.findById(event_id);
    return EventTicketData;
  } catch (error) {
    console.error("Error finding fetching EventTicket Data by Id:", error);
    throw new Error("Failed to Finding fetching EventTicket Data by Id");
  }
};

const deleteEventTicketByIdService = async (filterQuery) => {
  try {
    const result = await EventTickets.deleteOne(filterQuery);
    return result;
  } catch (error) {
    console.error("Error deleting EventTicket Data by Id:", error);
    throw new Error("Failed to Deleting EventTicket Data by Id:");
  }
};

const updateEventTicketDataService = async (filterquery, updateQuery) => {
  try {
    const EventTicketsData = await EventTickets.findByIdAndUpdate(
      filterquery,
      updateQuery
    );
    return EventTicketsData;
  } catch (error) {
    console.error("Error updating EventTicket Data:", error);
    throw new Error("Failed to update EventTicket Data");
  }
};

const generatePDFWithPuppeteer = async (ticket, filePath) => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const templatePath = path.join(process.cwd(), "templates", "ticket.ejs");

  try {
    const html = await ejs.renderFile(templatePath, { ticket });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for the ticket container to appear
    await page.waitForSelector(".ticket-container", { timeout: 30000 }); // 30-second wait

    console.log("Generating PDF...");
    await page.pdf({ path: filePath, format: "A4", printBackground: true });

    console.log("PDF generated successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    await browser.close();
  }
};

const generateQRCode = async (qrObj) => {
  const qrString = JSON.stringify(qrObj);
  return QRCode.toDataURL(qrString);
};

const zipFiles = async (files, zipFilePath) => {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const output = fs.createWriteStream(zipFilePath);

  return new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    files.forEach(({ path: filePath, name }) => {
      archive.file(filePath, { name });
    });
    archive.finalize();
  });
};

const sendEmailWithAttachment = async (
  toEmail,
  attachmentPath,
  customerName,
  eventName,
  logoUrl
) => {
  const SmtpData = await getSmtpDetailsService({});
  if (SmtpData.length == 0) {
    return "SMTP details not found in the database.";
  }

  const { Port, Host, Username, Password, Encryption } = SmtpData[0];

  const transporter = nodemailer.createTransport({
    host: Host,
    port: Port,
    secure: false,
    auth: {
      user: Username,
      pass: Password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_SENDER_NAME,
    to: toEmail,
    subject: "Your Event Tickets",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center;">
          <img src="${logoUrl}" alt="Event Logo" style="max-width: 150px; margin-bottom: 20px;">
        </div>
        <h2 style="color:rgb(20, 128, 216); text-align: center;">${eventName}</h2>
        <p style="font-size: 16px;">Dear ${customerName},</p>
        <p style="font-size: 16px;">
          Thank you for booking your tickets for <strong>${eventName}</strong>. Please find your tickets attached below.
        </p>
        <p style="font-size: 16px; text-align: center;">
          We look forward to seeing you at the event!
        </p>
        <p style="font-size: 14px; color: #888;">
          If you have any questions, feel free to reply to this email.
        </p>
        <div style="background-color: #f7f7f7; padding: 10px; text-align: center; margin-top: 20px;">
          <p style="font-size: 12px; color: #555;">This email was sent to ${toEmail}. If you did not request these tickets, please ignore this email.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: "tickets.zip",
        path: attachmentPath,
      },
    ],
  };

  return transporter.sendMail(mailOptions);
};

export {
  createEventTicketService,
  findOneEventTicketDataService,
  getEventTicketDataService,
  getPaginatedEventTicketsData,
  countEventTickets,
  getEventTicketByIdService,
  deleteEventTicketByIdService,
  updateEventTicketDataService,
  generatePDFWithPuppeteer,
  generateQRCode,
  zipFiles,
  sendEmailWithAttachment,
};
