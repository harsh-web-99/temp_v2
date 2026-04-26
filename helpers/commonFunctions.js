import fs from "fs";
import path from "path";
import { ImagesPath } from "../helpers/Enum.js";

const generateRandomAlphaNumeric = (length) => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let generatedId = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    generatedId += charset.charAt(randomIndex);
  }
  return generatedId;
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const logRequest = (message, body) => {
  console.log(message);
  console.log("Req Body Parameters:-----> " + JSON.stringify(body));
};

const validateEventLocationVariables = (var1, var2, var3) => {
  let variables = [var1, var2, var3];
  let count = variables.filter((value) => value == 1).length;
  return count == 1;
};

const sanitizeFileName = (fileName) => {
  return fileName.replace(/\s+/g, "_");
};

const saveQRCodeToServer = async (qrCodeUrl, bookingId) => {
  const base64Image = qrCodeUrl.split(";base64,").pop();
  const BookingQrImageFolderPath = ImagesPath.QrCodeImagePath;
  await fs.promises.mkdir(BookingQrImageFolderPath, { recursive: true });
  const sanitizedFileName = sanitizeFileName(`${bookingId}.png`);
  const qrImagePath = path.join(
    BookingQrImageFolderPath,
    `${Date.now()}-${sanitizedFileName}`
  );
  await fs.promises.writeFile(qrImagePath, base64Image, { encoding: "base64" });
  return qrImagePath;
};

const isValidYouTubeUrl = (url) => {
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
};

const isValidGoogleMapsIframe = (iframeString) => {
  const regex =
    /^<iframe src="https:\/\/www\.google\.com\/maps\/embed\?pb=.+?" width="\d+" height="\d+" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"><\/iframe>$/;

  return regex.test(iframeString);
};

export {
  generateRandomAlphaNumeric,
  generateOTP,
  logRequest,
  validateEventLocationVariables,
  sanitizeFileName,
  saveQRCodeToServer,
  isValidYouTubeUrl,
  isValidGoogleMapsIframe,
};
