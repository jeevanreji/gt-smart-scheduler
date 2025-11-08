import { GoogleGenAI, Type } from "@google/genai";
import { User, CalendarEvent, Room, Booking, Location, ExcludedSlot } from '../types';

// FIX 1: Check the correct Vite environment variable
// FIX 2: Use the correct Vite variable, and provide a fallback


// FIX 3: Pass the key to the AI instance
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const meetingProposalSchema = {
  type: Type.OBJECT,
  properties: {
    startTime: { type: Type.STRING, description: 'The proposed start time in ISO 8601 format.' },
    endTime: { type: Type.STRING, description: 'The proposed end time in ISO 8601 format.' },
    roomId: { type: Type.STRING, description: 'The ID of the chosen room.' },
    reasoning: { type: Type.STRING, description: 'A brief, friendly explanation for the choice.' },
  },
  required: ['startTime', 'endTime', 'roomId', 'reasoning'],
};

interface MeetingProposalResponse {
  startTime: string;
  endTime: string;
  roomId: string;
  reasoning: string;
}

export const findBestMeetingTime = async (
  participants: User[],
  calendars: Record<string, CalendarEvent[]>,
  availableRooms: Room[],
  existingBookings: Booking[],
  userLocation: Location | null,
  excludedSlots: ExcludedSlot[] = [],
  meetingDurationMinutes: number = 60
): Promise<MeetingProposalResponse | null> => {
  const today = new Date();
  const prompt = `
    You are a smart scheduling assistant for students at Georgia Tech. Your task is to find the single best time and room for a study session.

    # Context
    - Today's Date: ${today.toISOString()}
    - Meeting Duration: ${meetingDurationMinutes} minutes
    - Requester's Current Location: ${userLocation ? JSON.stringify(userLocation) : "Not available"}
    - Participants: ${JSON.stringify(participants.map(p => ({ id: p.id, name: p.name })), null, 2)}
    
    # Data
    - Participant Schedules (they are busy during these times): ${JSON.stringify(calendars, null, 2)}
    - All Possible Study Rooms: ${JSON.stringify(availableRooms, null, 2)}
    - Current Room Bookings (these rooms are unavailable at these times): ${JSON.stringify(existingBookings, null, 2)}
    - Previously Rejected Time Slots (DO NOT suggest these again): ${JSON.stringify(excludedSlots, null, 2)}

    # Goal and Constraints
    1.  Find a ${meetingDurationMinutes}-minute slot that works for ALL participants.
    2.  The slot MUST NOT conflict with any participant's schedule.
    3.  The slot MUST NOT conflict with any existing room bookings.
    4.  The slot MUST NOT be one of the previously rejected time slots.
    5.  The chosen room MUST have enough capacity for all ${participants.length} participants.
    6.  **PRIORITY:** If multiple rooms are available for a valid time slot, prioritize the one closest to the requester's current location.
    7.  The meeting must be scheduled for today, between 9:00 AM and 8:00 PM local time.
    8.  Provide a concise, helpful reasoning for your choice.

    Analyze all constraints and provide the single best option in JSON format matching the required schema.
    `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: meetingProposalSchema,
      },
    });

    const jsonText = response.text.trim();
    const proposal: MeetingProposalResponse = JSON.parse(jsonText);
    
    if (!proposal.roomId || !proposal.startTime || !proposal.endTime) {
        console.error("Invalid proposal received from Gemini:", proposal);
        return null;
    }

    return proposal;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return null;
  }
};