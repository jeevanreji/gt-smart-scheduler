export interface Location {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Room {
  id: string;
  building: string;
  name: string;
  capacity: number;
  location: Location;
}

export interface CalendarEvent {
  title: string;
  startTime: string; // ISO String
  endTime: string; // ISO String
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'; // This may not come from Google Calendar
}

export interface Email {
  id: string;
  snippet: string;
  sender: string;
  subject: string;
  timestamp: string; // ISO String
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