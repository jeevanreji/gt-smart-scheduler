export interface Location {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  timeZone: string; // Add timeZone here to use in service functions
}

export interface Room {
  id: string;
  building: string;
  name: string;
  capacity: number;
  location: Location;
}

// *** MODIFICATION: Updated to reflect Google API extraction fields ***
export interface CalendarEvent {
  userId: string; // The user the calendar belongs to ('me')
  title: string;
  startTimeUTC: string; // ISO String (UTC or with timezone offset)
  endTimeUTC: string;   // ISO String (UTC or with timezone offset)
  isTentative: boolean; // Reflects Google's responseStatus
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'; 
}

// *** ADDITION: New Interface for Creating Events ***
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

export interface Email {
  id: string;
  snippet: string;
  from: string; // Changed from 'sender' for consistency with Gmail API
  subject: string;
  date: string; // Changed from 'timestamp' for consistency with Gmail API
}

export interface MeetingProposal {
  room: Room;
  startTime: string; // ISO String
  endTime: string; // ISO String
  reasoning: string;
  responses: Record<string, boolean>; // userId -> accepted/declined
}

export type SessionState = 'PENDING' | 'PLANNING' | 'PROPOSED' | 'CONFIRMED' | 'CANCELED';

export interface ExcludedSlot {
    startTime: string;
    endTime: string;
}

export interface Session {
  id: string;
  name: string;
  participants: User[];
  state: SessionState;
  readyStatus: Record<string, 'READY' | 'PENDING'>; // userId -> status
  proposal?: MeetingProposal;
  excludedSlots: ExcludedSlot[];
}

export interface Booking {
    bookingId: string;
    roomId: string;
    startTime: string;
    endTime: string;
    participants: User[];
}


// export interface Location {
//   lat: number;
//   lng: number;
// }

// export interface User {
//   id: string;
//   name: string;
//   email: string;
// }

// export interface Room {
//   id: string;
//   building: string;
//   name: string;
//   capacity: number;
//   location: Location;
// }

// export interface CalendarEvent {
//   title: string;
//   startTime: string; // ISO String
//   endTime: string; // ISO String
//   priority?: 'HIGH' | 'MEDIUM' | 'LOW'; // This may not come from Google Calendar
// }

// export interface Email {
//   id: string;
//   snippet: string;
//   sender: string;
//   subject: string;
//   timestamp: string; // ISO String
// }

// export interface MeetingProposal {
//   room: Room;
//   startTime: string; // ISO String
//   endTime: string; // ISO String
//   reasoning: string;
//   responses: Record<string, boolean>; // userId -> accepted/declined
// }

// export type SessionState = 'PENDING' | 'PLANNING' | 'PROPOSED' | 'CONFIRMED' | 'CANCELED';

// export interface ExcludedSlot {
//     startTime: string;
//     endTime: string;
// }

// export interface Session {
//   id: string;
//   name: string;
//   participants: User[];
//   state: SessionState;
//   readyStatus: Record<string, 'READY' | 'PENDING'>; // userId -> status
//   proposal?: MeetingProposal;
//   excludedSlots: ExcludedSlot[];
// }

// export interface Booking {
//     bookingId: string;
//     roomId: string;
//     startTime: string;
//     endTime: string;
//     participants: User[];
// }