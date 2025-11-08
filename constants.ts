import { User, Room, CalendarEvent } from './types';

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Jeevan', email: 'jeevan@gmail.com' },
  { id: 'user-2', name: 'Sarah', email: 'sarah@gmail.com' },
  { id: 'user-3', name: 'Bob', email: 'bob@gmail.com' },
];

// Locations around Georgia Tech
export const AVAILABLE_ROOMS: Room[] = [
  { id: 'room-lib-1', building: 'GT Library', name: 'Study Room 101A', capacity: 4, location: { lat: 33.7745, lng: -84.3963 } },
  { id: 'room-lib-2', building: 'GT Library', name: 'Group Area 205C', capacity: 8, location: { lat: 33.7745, lng: -84.3963 } },
  { id: 'room-kacb-1', building: 'Klaus Advanced Computing', name: 'Project Room 2444', capacity: 6, location: { lat: 33.7773, lng: -84.3973 } },
  { id: 'room-kacb-2', building: 'Klaus Advanced Computing', name: 'Huddle Space 1122', capacity: 3, location: { lat: 33.7773, lng: -84.3973 } },
  { id: 'room-coda-1', building: 'CODA', name: 'Collaboration Pod 7B', capacity: 10, location: { lat: 33.7766, lng: -84.3908 } },
  { id: 'room-coda-2', building: 'CODA', name: 'Think Tank 12A', capacity: 5, location: { lat: 33.7766, lng: -84.3908 } },
  { id: 'room-ic-1', building: 'Instructional Center', name: 'Tutoring Room 105', capacity: 4, location: { lat: 33.7788, lng: -84.3989 } },
  { id: 'room-ic-2', building: 'Instructional Center', name: 'Presentation Room 211', capacity: 12, location: { lat: 33.7788, lng: -84.3989 } },
];

// Helper to create dates for today
const todayAt = (hour: number, minute: number = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const MOCK_CALENDARS: Record<string, CalendarEvent[]> = {
  // Mock calendars are still used for scheduling logic for other users in a session.
  'user-2': [ 
    { title: 'Physics Lab', startTime: todayAt(13), endTime: todayAt(15), priority: 'HIGH' },
    { title: 'TA Office Hours', startTime: todayAt(16), endTime: todayAt(17), priority: 'MEDIUM' },
  ],
  'user-3': [
    { title: 'Part-time Job', startTime: todayAt(9), endTime: todayAt(12), priority: 'HIGH' },
    { title: 'Gym', startTime: todayAt(17), endTime: todayAt(18, 30), priority: 'LOW' },
  ],
};
