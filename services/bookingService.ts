import { Room, Booking } from '../types';
import { AVAILABLE_ROOMS } from '../constants';

// In-memory store for bookings, can be synced from persistent storage.
let bookings: Booking[] = [];

/**
 * Sets the entire list of bookings, used for initializing from storage.
 * @param storedBookings The bookings loaded from a persistent source.
 */
export const setBookings = (storedBookings: Booking[]) => {
  bookings = storedBookings;
};

/**
 * Finds available rooms based on capacity and booking rules.
 * @param now The current time to start checking from.
 * @param requiredCapacity The number of people the room must hold.
 * @returns An array of available rooms.
 */
export const getAvailableRooms = (now: Date, requiredCapacity: number): Room[] => {
  const validRooms = AVAILABLE_ROOMS.filter(room => room.capacity >= requiredCapacity);
  
  // Filter out rooms that are booked within the next few hours to simplify logic.
  // A real implementation would check specific time slots.
  const bookedRoomIds = new Set(
    bookings
      .filter(booking => booking.startTime > now)
      .map(b => b.roomId)
  );

  return validRooms.filter(room => !bookedRoomIds.has(room.id));
};

/**
 * Creates a new booking and adds it to the in-memory store.
 * @param sessionId The session ID for the booking.
 * @param roomId The ID of the room being booked.
 * @param startTime The start time of the booking.
 * @param endTime The end time of the booking.
 * @returns The newly created booking object.
 */
export const createBooking = (sessionId: string, roomId: string, startTime: Date, endTime: Date): Booking => {
  const newBooking: Booking = {
    id: `booking-${Date.now()}`,
    sessionId,
    roomId,
    startTime,
    endTime,
  };
  bookings.push(newBooking);
  return newBooking;
};