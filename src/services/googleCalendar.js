/**
 * Google Calendar API Client Service
 * Configured with Google Client ID: 844515198625-o0dpk6i94q9niebk7lcmo1ut79c58q5g.apps.googleusercontent.com
 */

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "844515198625-o0dpk6i94q9niebk7lcmo1ut79c58q5g.apps.googleusercontent.com";

export const GCAL_SCOPES =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

const STORAGE_KEY = "successor_gcal_auth";

/**
 * Retrieve saved OAuth token & metadata
 */
export function getStoredGCalAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw);
    if (auth.expiresAt && Date.now() > auth.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return auth;
  } catch (err) {
    console.warn("Could not read GCal auth from localStorage:", err);
    return null;
  }
}

/**
 * Save OAuth token & metadata
 */
export function saveGCalAuth(tokenResponse, userEmail = "") {
  try {
    const expiresIn = Number(tokenResponse.expires_in || 3600);
    const authData = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000,
      scope: tokenResponse.scope,
      userEmail: userEmail || "",
      connectedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    return authData;
  } catch (err) {
    console.warn("Could not store GCal auth:", err);
    return null;
  }
}

/**
 * Disconnect Google Calendar
 */
export function disconnectGCal() {
  const current = getStoredGCalAuth();
  if (current?.accessToken && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(current.accessToken, () => {});
    } catch {
      // ignore
    }
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Request Access Token using Google Identity Services (GIS) Token Client
 */
export function requestGCalAccessToken(userEmail = "") {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services script not loaded. Check internet connection."));
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GCAL_SCOPES,
        hint: userEmail || undefined,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          const saved = saveGCalAuth(response, userEmail);
          resolve(saved);
        },
      });

      client.requestAccessToken({ prompt: "consent" });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fetch events for a specific calendar day from Google Calendar API v3
 */
export async function fetchGoogleCalendarEvents(targetDateStr, accessToken) {
  if (!accessToken || !targetDateStr) return [];

  const startOfDay = new Date(`${targetDateStr}T00:00:00Z`).toISOString();
  const endOfDay = new Date(`${targetDateStr}T23:59:59Z`).toISOString();

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", startOfDay);
  url.searchParams.set("timeMax", endOfDay);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "20");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      disconnectGCal();
      throw new Error("Google Calendar authorization expired. Please reconnect.");
    }
    const errText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  return items.map((item) => {
    const startRaw = item.start?.dateTime || item.start?.date || "";
    const endRaw = item.end?.dateTime || item.end?.date || "";

    let startTime = "All Day";
    let duration = "Event";

    if (startRaw.includes("T")) {
      const s = new Date(startRaw);
      const e = endRaw.includes("T") ? new Date(endRaw) : null;
      startTime = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (e) {
        const diffMins = Math.round((e.getTime() - s.getTime()) / (1000 * 60));
        duration = diffMins >= 60 ? `${(diffMins / 60).toFixed(1)}h` : `${diffMins}m`;
      }
    }

    return {
      id: `gcal-${item.id}`,
      gcalId: item.id,
      title: item.summary || "(No Title)",
      description: item.description || "",
      category: "Google Calendar",
      startTime,
      duration,
      color: "blue",
      syncedWithGCal: true,
      isLiveGoogleEvent: true,
      htmlLink: item.htmlLink || "",
      source: "Google Calendar (Live)",
      completed: false,
    };
  });
}

/**
 * Push / Insert a Task into Google Calendar as a scheduled event
 */
export async function pushTaskToGoogleCalendar(task, targetDateStr, accessToken) {
  if (!accessToken || !task) throw new Error("Missing access token or task");

  const startHour = 9;
  const startMinute = 0;
  const durationMinutes = task.duration?.includes("h")
    ? parseFloat(task.duration) * 60
    : parseInt(task.duration || "45", 10) || 45;

  const start = new Date(`${targetDateStr}T${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const eventPayload = {
    summary: `[Successor] ${task.title}`,
    description: `${task.description || "Daily focus task"}\n\nCategory: ${task.category || "Goal"}\nPriority: ${task.priority || "P1"}\nManaged via Successor Workstation`,
    start: {
      dateTime: start.toISOString(),
    },
    end: {
      dateTime: end.toISOString(),
    },
    reminders: {
      useDefault: true,
    },
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    if (res.status === 401) {
      disconnectGCal();
      throw new Error("Google Calendar authorization expired.");
    }
    const errText = await res.text();
    throw new Error(`Failed to create calendar event (${res.status}): ${errText}`);
  }

  return await res.json();
}
