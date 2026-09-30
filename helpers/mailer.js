import nodemailer from "nodemailer";
import { Smtp } from "../models/AllModels.js";
import { DefaultPasswordTemplate } from "../EmailTemplates/DefaultPasswordTemplate.js";
import { ResetPasswordTemplate } from "../EmailTemplates/ResetPasswordTemplate.js";
import ejs from "ejs";
import path from "path";
import { ImagesUrls } from "./Enum.js";

const createTransporter = async () => {
  const SmtpData = await Smtp.find({});

  if (SmtpData.length === 0) {
    throw new Error("SmtpDetails Not Found in Database");
  }

  const { Port, Host, Username, Password } = SmtpData[0];

  return nodemailer.createTransport({
    host: Host,

    port: Port,

    secure: false, // STARTTLS for port 587

    auth: {
      user: Username,

      pass: Password,
    },

    tls: {
      rejectUnauthorized: false,
    },
  });
};

const SendDefaultPasswordEmail = async (
  UserFullName,
  UserName,
  UserEmail,
  UserPassword,
  Role,
  LoginUrlLink
) => {
  try {
    console.log("Send Default Password Email Function Called");
    const transporter = await createTransporter();
    const TextParagraph = `Welcome to Eventing Club, Your account has been created as ${Role}, please log in to your account using the Username & Password below.`;
    const EventingClubLogo = ImagesUrls.EventingClubLogo;

    const mailOptions = {
      from: process.env.EMAIL_SENDER_NAME,
      to: UserEmail,
      subject: "Default Password",
      html: DefaultPasswordTemplate(
        UserFullName,
        TextParagraph,
        UserName,
        UserPassword,
        LoginUrlLink,
        EventingClubLogo
      ),
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Message sent:", info.messageId);
  } catch (error) {
    console.error("Error in SendDefaultPasswordEmail Function:", error);
  }
};

// Forgot Password Email

const sendMailForgotPasswordLink = async (
  resetPasswordLink,
  UserEmail,
  UserName
) => {
  try {
    console.log("Send Forgot Password Email Function Called");

    const transporter = await createTransporter();
    const TextParagraph = `Hello ${UserName}, We have received a request to reset your password. Please click the button below to reset your password. If you didn't reques
t this, please change your password immediately.`;

    const EventingClubLogo = ImagesUrls.EventingClubLogo;
    const mailOptions = {
      from: process.env.EMAIL_SENDER_NAME,
      to: UserEmail,
      subject: "Reset Password",
      html: ResetPasswordTemplate(
        resetPasswordLink,
        UserName,
        UserEmail,
        TextParagraph,
        EventingClubLogo
      ),
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Message sent:", info.messageId);
  } catch (error) {
    console.error("Error in sendMailForgotPasswordLink Function:", error);
  }
};

// Event Ticket Email

const sendEventTicketToCustomerEmail = async (
  UserEmail,
  eventName,
  bookingId,
  logoUrl,
  dateIconUrl,
  timeIconUrl,
  eventDate,
  eventTime,
  BookedEventTicketType,
  ticketName,
  ticketQuantity,
  venueName,
  venueCity,
  qrCodeUrl,
  ticketDownloadLink,
  termsAndConditions,
  TicketDescription
) => {
  try {
    console.log("Send Event Ticket Email Function Called");

    const transporter = await createTransporter();

    const html = await ejs.renderFile(
      path.join(process.cwd(), "templates", "Emailticket.ejs"),
      {
        eventName,
        bookingId,
        logoUrl,
        dateIconUrl,
        timeIconUrl,
        eventDate,
        eventTime,
        BookedEventTicketType,
        ticketName,
        ticketQuantity,
        venueName,
        venueCity,
        qrCodeUrl,
        downloadLink: ticketDownloadLink,
        termsAndConditions,
        TicketDescription,
      }
    );

    const mailOptions = {
      from: process.env.EMAIL_SENDER_NAME,
      to: UserEmail,
      subject: `${eventName} Event Ticket`,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent:", info.messageId);
  } catch (error) {
    console.error("Error in sendEventTicketToCustomerEmail Function:", error);
  }
};

// Test function to send email on server start

const testEmailOnServerStart = async () => {
  try {
    console.log("Testing Email Sending on Server Start");

    const transporter = await createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_SENDER_NAME,
      to: process.env.TEST_EMAIL, // Add a test email in .env
      subject: "Test Email on Server Start",
      text: "This is a test email to verify SMTP setup.",
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Test email sent:", info.messageId);
  } catch (error) {
    console.error("Error in testEmailOnServerStart Function:", error);
  }
};

export {
  SendDefaultPasswordEmail,
  sendMailForgotPasswordLink,
  sendEventTicketToCustomerEmail,
  testEmailOnServerStart,
};
