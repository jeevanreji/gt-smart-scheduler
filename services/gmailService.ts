import { MOCK_USERS, MOCK_EMAILS } from '../constants';
import { User, Email } from '../types';

// This is a mock service to simulate Google Sign-In and Gmail API calls.
// In a real application, this would use the Google API (gapi) library.

// We'll use a placeholder Client ID as this is just for demonstration.
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const MOCK_DELAY = 500; // ms

let isSignedIn = false;
let currentUser: User | null = null;

export const initClient = async (): Promise<{ loaded: boolean; error?: string }> => {
  console.log('[Gmail Service] Initializing...');
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  // This mock will always succeed for demonstration purposes,
  // but we'll keep the error logic for when a real implementation is added.
  if (CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
    const message = "This is a mock implementation. The real Google Sign-In is disabled because the Client ID is a placeholder.";
    console.warn(`[Gmail Service] ${message}`);
  }
  console.log('[Gmail Service] Mock GAPI client initialized.');
  return { loaded: true };
};

export const signIn = async (): Promise<User> => {
  console.log('[Gmail Service] Signing in...');
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  // In this mock, we'll just pick the first user from our constants.
  const user = MOCK_USERS[0];
  isSignedIn = true;
  currentUser = user;
  
  console.log(`[Gmail Service] Signed in as ${user.email}`);
  return user;
};

export const signOut = async (): Promise<void> => {
  console.log('[Gmail Service] Signing out...');
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  isSignedIn = false;
  currentUser = null;
  console.log('[Gmail Service] Signed out.');
};

export const listEmails = async (): Promise<Email[]> => {
  if (!isSignedIn || !currentUser) {
    console.warn('[Gmail Service] Not signed in. Cannot fetch emails.');
    return [];
  }
  
  console.log(`[Gmail Service] Fetching emails for ${currentUser.email}`);
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  const emails = MOCK_EMAILS[currentUser.id] || [];
  console.log(`[Gmail Service] Found ${emails.length} emails.`);
  return emails;
};
