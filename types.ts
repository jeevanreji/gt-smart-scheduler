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
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Email {
  id: string;
  threadId: string;
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

export interface Session {
  id: string;
  name: string;
  participants: User[];
  state: SessionState;
  readyStatus: Record<string, 'READY' | 'PENDING'>; // userId -> status
  proposal?: MeetingProposal;
}
