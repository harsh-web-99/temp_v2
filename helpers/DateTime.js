import moment from "moment-timezone";

const getStartEndDateTime = (StartDate, StartTime, EndDate, EndTime) => {
  const startDatetimeStr = `${StartDate}T${
    StartTime ? StartTime : "00:00:00"
  }+00:00`;
  const endDatetimeStr = `${EndDate}T${EndTime ? EndTime : "23:59:59"}+00:00`;

  const startDatetime = new Date(startDatetimeStr);
  const endDatetime = new Date(endDatetimeStr);

  const iso8601Start = startDatetime.toISOString();
  const iso8601End = endDatetime.toISOString();

  return [iso8601Start, iso8601End];
};

const getAsiaCalcuttaCurrentDateTimeinIsoFormat = () => {
  const currentMoment = moment().tz("Asia/Kolkata");

  // Format the date and time
  const currentDate = currentMoment.format("YYYY-MM-DD");
  const currentTime = currentMoment.format("HH:mm:ss");

  const currentDateTimeStr = `${currentDate}T${
    currentTime ? currentTime : "00:00:00"
  }+00:00`;

  const CurrentDateTime = new Date(currentDateTimeStr);

  const currentDateTimeIsoFormat = CurrentDateTime.toISOString();

  return currentDateTimeIsoFormat;
};

const getAsiaCalcutta4hoursSubtractedCurrentDateTimeinIsoFormat = () => {
  const currentMoment = moment().tz("Asia/Kolkata");

  // Subtract 4 hours from the current date and time
  const adjustedMoment = currentMoment.subtract(4, "hours");

  // Format the date and time
  const currentDate = adjustedMoment.format("YYYY-MM-DD");
  const currentTime = adjustedMoment.format("HH:mm:ss");

  const currentDateTimeStr = `${currentDate}T${
    currentTime ? currentTime : "00:00:00"
  }+00:00`;

  const adjustedDateTime = new Date(currentDateTimeStr);

  const adjustedDateTimeIsoFormat = adjustedDateTime.toISOString();

  return adjustedDateTimeIsoFormat;
};

const getFormattedEventDateTimeForTickets = (eventDateTimeObj) => {
  function formatDate(dateTime) {
    return `${getMonthName(dateTime.getMonth())} ${addLeadingZero(
      dateTime.getDate()
    )}, ${dateTime.getFullYear()}`;
  }

  function formatTime(dateTime) {
    return `${addLeadingZero(dateTime.getHours())}:${addLeadingZero(
      dateTime.getMinutes()
    )}`;
  }

  function getMonthName(monthIndex) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[monthIndex];
  }

  function addLeadingZero(number) {
    return number < 10 ? `0${number}` : number;
  }

  const startDateTime = new Date(eventDateTimeObj.EventStartDateTime);
  const endDateTime = new Date(eventDateTimeObj.EventEndDateTime);

  const startLocalDateTime = new Date(
    startDateTime.getTime() + startDateTime.getTimezoneOffset() * 60000
  );
  const endLocalDateTime = new Date(
    endDateTime.getTime() + endDateTime.getTimezoneOffset() * 60000
  );

  const formattedStartDate = formatDate(startLocalDateTime);
  const formattedEndDate = formatDate(endLocalDateTime);

  const formattedStartTime = formatTime(startLocalDateTime);
  const formattedEndTime = formatTime(endLocalDateTime);

  const formattedDateTime = `${formattedStartDate} - ${formattedEndDate}    ${formattedStartTime} - ${formattedEndTime}`;
  const EventDateTimeObj = {
    eventDateTime_Id: eventDateTimeObj._id,
    formattedDateTime: formattedDateTime,
  };
  return EventDateTimeObj;
};

const FormatEventDateTimeForWebsite = (isoDateString) => {
  // Create a Date object from the ISO string
  const dateObject = new Date(isoDateString);

  // Format the date in UTC
  const optionsDate = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const date = dateObject.toLocaleDateString("en-GB", optionsDate);

  // Extract and format the time in UTC with 24-hour format
  const optionsTime = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  };
  const time = dateObject.toLocaleTimeString("en-GB", optionsTime);

  // Format the date to include a comma
  const [day, month, year] = date.split(" ");
  const formattedDate = `${day} ${month},${year}`;

  return {
    date: formattedDate,
    time: time,
  };
};

const FormatEventDateTimeForScannerUser = (isoDateString) => {
  // Create a Date object from the ISO string
  const dateObject = new Date(isoDateString);

  // Format the date in UTC
  const optionsDate = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const date = dateObject.toLocaleDateString("en-GB", optionsDate);

  // Extract and format the time in UTC with 12-hour format and AM/PM
  const optionsTime = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: true, // Enable 12-hour format with AM/PM
  };
  const time = dateObject.toLocaleTimeString("en-GB", optionsTime);

  // Format the date to include a comma
  const [day, month, year] = date.split(" ");
  const formattedDate = `${day} ${month},${year}`;

  return {
    date: formattedDate,
    time: time,
  };
};

export {
  getStartEndDateTime,
  getFormattedEventDateTimeForTickets,
  getAsiaCalcuttaCurrentDateTimeinIsoFormat,
  getAsiaCalcutta4hoursSubtractedCurrentDateTimeinIsoFormat,
  FormatEventDateTimeForWebsite,
  FormatEventDateTimeForScannerUser,
};
