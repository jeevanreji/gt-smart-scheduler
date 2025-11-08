import { Email, User } from '../types';

// IMPORTANT: Replace with your actual Google Cloud Client ID
const CLIENT_ID = '111234179842-vpsmqmcvtaps28hj0t06tokhimo7m537.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly';

let tokenClient: any = null;
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let gapiInited = false;
let gisInited = false;

const parseUser = (profile: any): User | null => {
    if (!profile) return null;
    return {
        id: profile.resourceName.split('/')[1],
        name: profile.names && profile.names.length > 0 ? profile.names[0].displayName : 'User',
        email: profile.emailAddresses && profile.emailAddresses.length > 0 ? profile.emailAddresses[0].value : '',
    };
};

/**
 * Initializes the Google API client and Google Identity Services.
 * Returns a promise that resolves with the current user if already signed in.
 */
export const initGoogleClient = (): Promise<User | null> => {
    return new Promise((resolve, reject) => {
        if (CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
           return reject(new Error('Google Client ID is not configured.'));
        }

        const GAPI_SCRIPT_URL = 'https://apis.google.com/js/api.js';
        // FIX: Specify HTMLScriptElement as the type for querySelector to allow access to script-specific properties.
        let script = document.querySelector<HTMLScriptElement>(`script[src="${GAPI_SCRIPT_URL}"]`);

        const gapiLoadCallback = () => window.gapi.load('client', () => gapiInit(resolve, reject));

        if (!script) {
            script = document.createElement('script');
            script.src = GAPI_SCRIPT_URL;
            script.async = true;
            script.defer = true;
            script.onload = gapiLoadCallback;
            script.onerror = () => reject(new Error('Failed to load Google API script.'));
            document.body.appendChild(script);
        } else if (gapiInited) {
            // If already loaded and initialized, resolve immediately.
            getUserProfile().then(resolve).catch(reject);
            return;
        } else {
            // If script exists but might not have loaded, attach onload
            script.addEventListener('load', gapiLoadCallback);
        }

        try {
            if (!gisInited) {
                 tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // Callback is handled dynamically in signIn
                });
                gisInited = true;
            }
        } catch (e) {
            return reject(new Error('Failed to initialize Google Identity Services. Check for ad blockers.'));
        }
        
         // Add a timeout in case something goes wrong
        setTimeout(() => {
            if (!gapiInited) {
                reject(new Error('Google API initialization timed out.'));
            }
        }, 10000);
    });
};

const gapiInit = async (resolve: (user: User | null) => void, reject: (reason?: any) => void) => {
    try {
        await window.gapi.client.init({
            clientId: CLIENT_ID,
            discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest",
                "https://www.googleapis.com/discovery/v1/apis/people/v1/rest"
            ],
        });
        gapiInited = true;
        // Check if user is already signed in from a previous session
        if (window.gapi.client.getToken() !== null) {
            const user = await getUserProfile();
            resolve(user);
        } else {
            resolve(null);
        }
    } catch (error) {
        reject(error);
    }
};

const getUserProfile = (): Promise<User | null> => {
     return new Promise((resolve, reject) => {
        window.gapi.client.people.people.get({
            'resourceName': 'people/me',
            'personFields': 'names,emailAddresses',
        }).then((response: any) => {
            resolve(parseUser(response.result));
        }).catch((err: any) => {
            console.error("Error fetching user profile:", err);
            reject(err);
        });
     });
}


/**
 *  Prompts the user to sign in and grant permissions.
 */
export const handleSignIn = (): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    if (!gapiInited || !gisInited) {
        return reject(new Error("Google services not initialized."));
    }
    
    tokenClient.callback = async (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
           try {
               const user = await getUserProfile();
               resolve(user);
           } catch(error) {
               reject(error);
           }
        } else {
            reject(new Error("Sign-in failed. No access token received."));
        }
    };
      
    if (window.gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
  });
};

/**
 *  Signs the user out.
 */
export const handleSignOut = (callback: () => void) => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      window.gapi.client.setToken(null);
      callback();
    });
  } else {
      callback();
  }
};


/**
 * Fetches the most recent emails from the user's Gmail account.
 */
export const fetchEmails = async (): Promise<Email[]> => {
    if (!window.gapi.client.getToken()) {
        console.error("Not authenticated");
        return [];
    }

    try {
        const response = await window.gapi.client.gmail.users.messages.list({
            'userId': 'me',
            'maxResults': 15,
            'q': 'in:inbox'
        });

        const messages = response.result.messages || [];
        if (messages.length === 0) {
            return [];
        }

        const batch = window.gapi.client.newBatch();
        messages.forEach((message: any) => {
            batch.add(window.gapi.client.gmail.users.messages.get({
                'userId': 'me',
                'id': message.id,
                'format': 'metadata',
                'metadataHeaders': ['Subject', 'From', 'Date']
            }));
        });
        
        const batchResponse = await batch;
        const emails: Email[] = Object.values(batchResponse.result).map((res: any) => {
            const headers = res.result.payload.headers;
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const sender = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
            const timestamp = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
            
            return {
                id: res.result.id,
                threadId: res.result.threadId,
                snippet: res.result.snippet,
                subject,
                sender,
                timestamp,
            };
        });

        return emails;
        
    } catch (err) {
        console.error("Error fetching emails:", err);
        return [];
    }
};