import dotenv from "dotenv";
dotenv.config();

const config = {
  backendPort: 8000,
};
let ServerBase_Url;
let AdminPanelBase_Url;
let WebisteBase_Url;

const isProduction = process.env.IS_PRODUCTION;
if (isProduction == "true") {
  ServerBase_Url = "https://node.eventingclub.in";
  AdminPanelBase_Url = "https://admins.eventingclub.in";
  WebisteBase_Url = "https://www.eventingclub.in";
} else {
  ServerBase_Url = "https://devapi.eventingclub.in";
  AdminPanelBase_Url = "http://192.168.1.109:5173";
 WebisteBase_Url = "https://eventingwebsite.vercel.app";
}

const Urls = {
  SuperAdminLogin: `${AdminPanelBase_Url}/superAdmin`,
  SuperAdminResetPassword: `${AdminPanelBase_Url}/superadmin/resetpassword`,

  OrganizerLogin: `${AdminPanelBase_Url}/organizerlogin`,
  OrganizerResetPassword: `${AdminPanelBase_Url}/organizer/resetpassword`,

  PromoterLogin: `${AdminPanelBase_Url}/promoterlogin`,
  PromoterResetPassword: `${AdminPanelBase_Url}/promoter/resetpassword`,

  EmployeeLogin: `${AdminPanelBase_Url}/employee`,
  EmployeeResetPassword: `${AdminPanelBase_Url}/employee/resetpassword`,

  WebsiteCustomersLogin: `${AdminPanelBase_Url}/websitecustomers`,
  WebSiteCustomerResetPassword: `${AdminPanelBase_Url}/websitecustomers/resetpassword`,
};

const ConvinenceFeeGstPercentage = 18;

export {
  config,
  Urls,
  ServerBase_Url,
  AdminPanelBase_Url,
  WebisteBase_Url,
  ConvinenceFeeGstPercentage,
  isProduction,
};
