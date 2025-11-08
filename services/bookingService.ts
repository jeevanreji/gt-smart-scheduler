import { Room, User, Booking } from "../types";

let bookings: Booking[] = [];

/**
 * Initializes the booking service with existing bookings from a persistent source.
 * @param existingBookings An array of bookings to load into memory.
 */
export const init = (existingBookings: Booking[]) => {
    console.log(`[Booking Service] Initializing with ${existingBookings.length} bookings.`);
    bookings = existingBookings;
};

/**
 * Checks if a room is available for a given time slot, avoiding overlaps.
 * @param roomId The ID of the room to check.
 * @param startTime The desired start time (ISO string).
 * @param endTime The desired end time (ISO string).
 * @returns `true` if the room is available, `false` otherwise.
 */
const isRoomAvailable = (roomId: string, startTime: string, endTime: string): boolean => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    for (const booking of bookings) {
        if (booking.roomId === roomId) {
            const bookingStart = new Date(booking.startTime).getTime();
            const bookingEnd = new Date(booking.endTime).getTime();
            // Check for overlap: (StartA < EndB) and (EndA > StartB)
            if (start < bookingEnd && end > bookingStart) {
                return false; // There is an overlap
            }
        }
    }
    return true; // No overlaps found
};


/**
 * Books a room if it's available and adds it to the internal database.
 * @returns The new booking object if successful, otherwise null.
 */
export const bookRoom = (
  room: Room, 
  startTime: string, 
  endTime: string, 
  attendees: User[]
): Booking | null => {
  const attendeeEmails = attendees.map(a => a.email).join(', ');
  console.log(
    `[Booking Service] Attempting to book room: "${room.name}"\n` +
    `From: ${new Date(startTime).toLocaleString()} To: ${new Date(endTime).toLocaleString()}`
  );

  if (!isRoomAvailable(room.id, startTime, endTime)) {
      console.error(`[Booking Service] CONFLICT: Room ${room.id} is already booked for this time.`);
      return null;
  }
  
  const newBooking: Booking = {
      bookingId: `booking-${Date.now()}`,
      roomId: room.id,
      startTime,
      endTime,
      participants: attendees
  };

  bookings.push(newBooking);
  console.log(`[Booking Service] Booking successful! ID: ${newBooking.bookingId}`);
  return newBooking;
};