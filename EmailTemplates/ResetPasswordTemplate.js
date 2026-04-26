const ResetPasswordTemplate = (
  resetPasswordLink,
  UserName,
  UserEmail,
  TextParagraph,
  EventingClubLogo
) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password Email</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f7f7f7;
          font-family: Arial, sans-serif;
        }
        table {
          border-spacing: 0;
          width: 100%;
        }
        td {
          padding: 0;
        }
        img {
          border: 0;
          height: auto;
          line-height: 100%;
          outline: none;
          text-decoration: none;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border: 1px solid #dddddd;
          border-radius: 8px;
          overflow: hidden;
        }
        .email-header {
          background-color: #0072ff;
          padding: 20px;
          text-align: center;
        }
        .email-header img {
          max-width: 200px;
        }
        .email-body {
          padding: 20px;
        }
        .email-body h2 {
          color: #333333;
          font-size: 24px;
        }
        .email-body p {
          color: #666666;
          font-size: 16px;
          line-height: 1.5;
        }
        .reset-button {
          margin-top: 20px;
          text-align: center;
        }
        .reset-button a {
          text-decoration: none;
          color: #ffffff;
          background-color: #0072ff;
          padding: 12px 30px;
          border-radius: 8px;
          font-size: 18px;
          display: inline-block;
        }
        .reset-button a:hover {
          background-color: #0056cc;
        }
        .email-footer {
          background-color: #f7f7f7;
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #999999;
        }
      </style>
    </head>
    <body>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding: 40px 0; background-color: #f7f7f7;">
            <table class="email-container" cellpadding="0" cellspacing="0" border="0" width="100%">
              <!-- Email Header -->
              <tr>
                <td class="email-header">
                  <img src="${EventingClubLogo}" alt="Eventing Club Logo">
                </td>
              </tr>

              <!-- Email Body -->
              <tr>
                <td class="email-body">
                  <h2>Hello ${UserName},</h2>
                  <p>${TextParagraph}</p>

                  <!-- Reset Password Button -->
                  <div class="reset-button">
                    <a href="${resetPasswordLink}" target="_blank">Reset Your Password</a>
                  </div>
                </td>
              </tr>

              <!-- Email Footer -->
              <tr>
                <td class="email-footer">
                  If you did not request this password reset, please ignore this email or contact support at support@eventingclub.in.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export { ResetPasswordTemplate };
