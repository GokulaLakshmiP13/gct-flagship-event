const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

export const sendRegistrationToSheet = async (data: any) => {
  if (!GOOGLE_SHEET_URL) {
    console.warn("VITE_GOOGLE_SHEET_URL is not set in .env. Skipping Google Sheets sync.");
    return;
  }
  
  try {
    // We use mode: 'no-cors' and text/plain to avoid Google Apps Script blocking the request
    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        action: "new_registration",
        timestamp: new Date().toLocaleString(),
        ...data
      }),
    });
    console.log("Successfully synced to Google Sheet!");
  } catch (error) {
    console.error("Failed to sync to Google Sheet", error);
  }
};

export const updateAttendanceInSheet = async (email: string, eventName: string) => {
  if (!GOOGLE_SHEET_URL) return;
  try {
    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "update_attendance",
        contact_email: email,
        event_name: eventName
      }),
    });
    console.log("Attendance sync sent to Google Sheet!");
  } catch (error) {
    console.error("Failed to update attendance in Sheet", error);
  }
};
