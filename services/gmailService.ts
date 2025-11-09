import { User, Email, CalendarEvent } from '../types';

declare global {
  interface Window {
    gapi: any;
    google: any;
    tokenClient: any;
  }
}

const CLIENT_ID = '111234179842-vpsmqmcvtaps28hj0t06tokhimo7m537.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let tokenClient: any;

/**
 * Helper that waits for the GAPI and GSI scripts to be loaded and ready.
 */
const waitForGoogleApis = (timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (window.gapi && window.google?.accounts?.oauth2) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error("Google API scripts failed to load in time. Check for network issues or script blockers."));
            }
        }, 100);
    });
};

export const initClient = async (): Promise<void> => {
    try {
        await waitForGoogleApis();

        await new Promise<void>((resolve, reject) => {
            // GAPI client is used for non-GSI APIs like Gmail, Calendar
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        clientId: CLIENT_ID,
                        scope: SCOPES,
                        discoveryDocs: [
                            "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
                            "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
                            "https://www.googleapis.com/discovery/v1/apis/people/v1/rest"
                        ],
                    });
                    
                    // GSI client is used for modern OAuth 2.0 flows
                    tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: '', // The callback is handled by the promise in signIn
                    });

                    resolve();
                } catch (error: any) {
                    console.error("Error initializing GAPI client", error);
                    reject(new Error(error.details || "Could not initialize Google APIs. Check API key and client configuration."));
                }
            });
        });
    } catch (error) {
         console.error("Google API loading error:", error);
         if (error instanceof Error) {
            throw error;
        }
        throw new Error("A generic error occurred while loading Google APIs.");
    }
};

export const signIn = (isSilent = false): Promise<User> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject(new Error("Google Token Client is not initialized."));
        }

        tokenClient.callback = async (resp: any) => {
            if (resp.error !== undefined) {
                 // GSI returns an object with `type: 'popup_closed_by_user'` on close
                if (resp.type === 'popup_closed_by_user') {
                    return reject(new Error("Sign-in cancelled by user."));
                }
                console.error("Google Sign-In Error:", resp);
                reject(new Error(resp.error?.message || "User failed to sign in or grant permissions."));
            }
            try {
                const profile = await window.gapi.client.people.people.get({
                    resourceName: 'people/me',
                    personFields: 'names,emailAddresses',
                });
                
                const user: User = {
                    id: profile.result.resourceName.split('/')[1],
                    name: profile.result.names[0].displayName,
                    email: profile.result.emailAddresses[0].value,
                };
                resolve(user);
            } catch (error) {
                reject(new Error("Failed to fetch user profile after sign-in."));
            }
        };

        if (window.gapi.client.getToken() === null || !isSilent) {
             tokenClient.requestAccessToken({ prompt: isSilent ? 'none' : 'consent' });
        } else {
             tokenClient.requestAccessToken({ prompt: 'none' });
        }
    });
};


export const signOut = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {});
    window.gapi.client.setToken(null);
  }
};

export const fetchEmails = async (maxResults = 4): Promise<Email[]> => {
    try {
        const response = await window.gapi.client.gmail.users.messages.list({
            'userId': 'me',
            'maxResults': maxResults,
            'q': 'in:inbox'
        });

        const messages = response.result.messages || [];
        if (messages.length === 0) return [];
        
        const emailPromises = messages.map((message: any) => 
            window.gapi.client.gmail.users.messages.get({
                'userId': 'me',
                'id': message.id,
                'format': 'metadata',
                'metadataHeaders': ['Subject', 'From', 'Date']
            })
        );
        
        const emailResponses = await Promise.all(emailPromises);
        
        return emailResponses.map((res: any) => {
            const headers = res.result.payload.headers;
            const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';
            const senderHeader = getHeader('From');
            const senderMatch = senderHeader.match(/(.*)<.*>/);
            
            return {
                id: res.result.id,
                snippet: res.result.snippet,
                subject: getHeader('Subject'),
                sender: senderMatch ? senderMatch[1].trim().replace(/"/g, '') : senderHeader,
                timestamp: new Date(getHeader('Date')).toISOString(),
            };
        });

    } catch (error) {
        console.error("Error fetching emails:", error);
        return [];
    }
};

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
    try {
        const today = new Date();
        const timeMin = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const timeMax = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const response = await window.gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': timeMin,
            'timeMax': timeMax,
            'showDeleted': false,
            'singleEvents': true,
            'orderBy': 'startTime'
        });

        const events = response.result.items || [];
        return events.map((event: any) => ({
            title: event.summary,
            startTime: event.start.dateTime || event.start.date,
            endTime: event.end.dateTime || event.end.date,
        }));

    } catch (error) {
        console.error("Error fetching calendar events:", error);
        return [];
    }
};