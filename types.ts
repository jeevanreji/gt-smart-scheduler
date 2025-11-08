export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  id:string;
  name: string;
  participants: User[];
  readyStatus: Record<string, 'READY' | 'PENDING'>;
  state: 'PENDING' | 'PLANNING' | 'PROPOSED' | 'CONFIRMED' | 'CANCELED';
  hostId: string;
  proposal?: Proposal;
}

export type View = 
  | { name: 'dashboard' }
  | { name: 'session'; sessionId: string };

export interface Location {
  lat: number;
  lng: number;
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
  startTime: string; // ISO string
  endTime: string; // ISO string
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Proposal {
  room: Room;
  startTime: string; // ISO string
  endTime: string; // ISO string
  reasoning: string;
  responses: Record<string, boolean>; // userId: accepted
}

export interface Booking {
  id: string;
  sessionId: string;
  roomId: string;
  startTime: Date;
  endTime: Date;
}

// Updated Email type for real Gmail API
export interface Email {
  id: string;
  threadId: string;
  snippet: string;
  sender: string;
  subject: string;
  timestamp: string;
}