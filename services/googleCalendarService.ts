import { CalendarEvent, User } from '../types';

// IMPORTANT: These need to be set in your .env.local file
const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = process.env.VITE_API_KEY || '';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

// *** MODIFICATION 1: UPDATED SCOPES FOR WRITE ACCESS ***
// Changed 'calendar.readonly' to the full 'calendar' scope.
const SCOPES = 
    'https://www.googleapis.com/auth/calendar ' + // FULL CALENDAR SCOPE
    'https://www.googleapis.com/auth/userinfo.profile ' +
    'https://www.googleapis.com/auth/userinfo.email ' +
    'https://www.googleapis.com/auth/gmail.readonly'; // Keep Gmail scope for the fetchEmails service

let tokenClient: google.accounts.oauth2.TokenClient;
let gapiInited = false;
let gisInited = false;
let initInProgress = false;
const initCallbacks: ((loaded: boolean) => void)[] = [];


const onGapiLoad = () => {
    gapi.load('client', initializeGapiClient);
};
const onGisLoad = () => {
    initializeGisClient();
};

const checkAllLoaded = () => {
    if (gapiInited && gisInited) {
        initCallbacks.forEach(cb => cb(true));
        initCallbacks.length = 0; // Clear callbacks
    }
};

const initializeGapiClient = async () => {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    checkAllLoaded();
};

const initializeGisClient = () => {
    if (!CLIENT_ID) {
        console.error("VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.");
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, // Callback is handled by the promise in signIn
    });
    gisInited = true;
    checkAllLoaded();
};


export const initGoogleClient = (callback: (loaded: boolean) => void) => {
    initCallbacks.push(callback);
    if (initInProgress) return;
    initInProgress = true;
    
    // Load GAPI
    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = onGapiLoad;
    document.body.appendChild(scriptGapi);

    // Load GIS
    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = onGisLoad;
    document.body.appendChild(scriptGis);
};

export const signIn = (): Promise<google.accounts.oauth2.TokenResponse> => {
    return new Promise((resolve, reject) => {
        const callback = (resp: google.accounts.oauth2.TokenResponse) => {
            if (resp.error) {
                reject(resp);
            } else {
                resolve(resp);
            }
        };
        tokenClient.callback = callback;

        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            tokenClient.requestAccessToken({prompt: ''});
        }
    });
};

export const signOut = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken(null);
        });
    }
};

export const getProfile = async (): Promise<User | null> => {
    try {
        const response = await gapi.client.request({
            'path': 'https://www.googleapis.com/oauth2/v2/userinfo'
        });
        const profile = response.result as {id: string, name: string, email: string};
        return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    } catch (err) {
        console.error("Error fetching profile", err);
        return null;
    }
}

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
    try {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const response = await gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': now.toISOString(),
            'timeMax': nextWeek.toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'orderBy': 'startTime'
        });

        const items = response.result.items;
        if (!items || items.length === 0) {
            return [];
        }

       return items.map((event: any) => ({
            userId: 'me', // The logged in user
            title: event.summary,
            // CHANGE: Map service output to component expectations
            startTime: event.start.dateTime || event.start.date, // <--- Change
            endTime: event.end.dateTime || event.end.date,       // <--- Change
            isTentative: event.attendees?.find((a: any) => a.self)?.responseStatus === 'tentative',
            // REMOVE: Explicit startTimeUTC/endTimeUTC (since they are now startTime/endTime)
        }));
    } catch (err) {
        console.error("Execute error", err);
        return [];
    }
};

// *** MODIFICATION 2: NEW INTERFACE FOR EVENT BODY ***
export interface CalendarEventBody {
    summary: string;
    location?: string;
    description?: string;
    start: {
        dateTime: string; // e.g., '2025-11-08T17:00:00-04:00'
        timeZone: string; // e.g., 'America/New_York'
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    attendees?: {email: string}[];
}


// *** MODIFICATION 3: NEW FUNCTION TO CREATE CALENDAR EVENT ***
/**
 * Creates a new calendar event for the authenticated user's primary calendar.
 * @param eventBody The structure of the event (summary, start, end, attendees, etc.)
 * @returns A promise that resolves to the created event object from the API.
 */
export const createCalendarEvent = async (eventBody: CalendarEventBody) => {
    try {
        const response = await window.gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': eventBody // The event structure to be inserted
        });
        
        console.log("Calendar event created successfully:", response.result.summary);
        return response.result;

    } catch (error) {
        console.error("Error creating calendar event:", error);
        throw error; // Re-throw the error so the calling component can handle it
    }
};