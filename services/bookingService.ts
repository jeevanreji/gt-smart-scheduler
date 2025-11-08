import { Room, User } from "../types";

// This is a mock service to simulate booking a room.
// In a real application, this would interact with a calendar or booking API.

/**
 * "Books" a room by logging the action.
 * @param room The room to book.
 * @param startTime The start time of the booking.
 * @param endTime The end time of the booking.
 * @param attendees The users attending the meeting.
 * @returns A promise that resolves with a mock booking confirmation.
 */
export const bookRoom = async (
  room: Room, 
  startTime: string, 
  endTime: string, 
  attendees: User[]
): Promise<{ success: boolean; bookingId: string }> => {
  const attendeeEmails = attendees.map(a => a.email).join(', ');
  console.log(
    `[Booking Service] Attempting to book room: "${room.name}" in "${room.building}"\n` +
    `From: ${new Date(startTime).toLocaleString()}\n` +
    `To:   ${new Date(endTime).toLocaleString()}\n` +
    `For:  ${attendeeEmails}`
  );
  
  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('[Booking Service] Mock booking successful!');
  return { success: true, bookingId: `mock-booking-${Date.now()}` };
};
