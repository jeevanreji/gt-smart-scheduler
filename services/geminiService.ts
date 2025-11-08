import { GoogleGenAI, Type } from "@google/genai";
import { User, CalendarEvent, Room } from '../types';

if (!process.env.API_KEY) {
  // A default key is provided for demo purposes, but it's recommended to use your own.
  console.warn("API_KEY environment variable is not set. Using a default key.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'default-api-key' });

// Define the expected JSON schema for the model's response
const meetingProposalSchema = {
  type: Type.OBJECT,
  properties: {
    startTime: {
      type: Type.STRING,
      description: 'The proposed start time for the meeting in ISO 8601 format.',
    },
    endTime: {
      type: Type.STRING,
      description: 'The proposed end time for the meeting in ISO 8601 format.',
    },
    roomId: {
      type: Type.STRING,
      description: 'The ID of the chosen room from the provided list of available rooms.',
    },
    reasoning: {
      type: Type.STRING,
      description: 'A brief, friendly explanation for why this specific time and room were chosen, considering participant schedules and room locations.',
    },
  },
  required: ['startTime', 'endTime', 'roomId', 'reasoning'],
};

interface MeetingProposalResponse {
  startTime: string;
  endTime: string;
  roomId: string;
  reasoning: string;
}

/**
 * Uses the Gemini API to find the optimal meeting time and location.
 */
export const findBestMeetingTime = async (
  participants: User[],
  calendars: Record<string, CalendarEvent[]>,
  availableRooms: Room[],
  meetingDurationMinutes: number = 60
): Promise<MeetingProposalResponse | null> => {
  const today = new Date();
  const prompt = `
    You are a smart scheduling assistant for students at Georgia Tech. Your task is to find the best possible time and location for a study session.

    Here is the required information:
    - Today's Date: ${today.toISOString()}
    - Meeting Duration: ${meetingDurationMinutes} minutes
    - Participants: ${JSON.stringify(participants.map(p => ({ id: p.id, name: p.name })), null, 2)}
    - Participant Schedules (events they are busy): ${JSON.stringify(calendars, null, 2)}
    - Available Study Rooms: ${JSON.stringify(availableRooms, null, 2)}

    Your goal is to find a ${meetingDurationMinutes}-minute slot today that works for all participants and book a suitable room.

    Constraints and Preferences:
    1.  The meeting must not conflict with any participant's existing calendar events.
    2.  The chosen room must have enough capacity for all participants.
    3.  Consider a reasonable time, ideally between 9:00 AM and 8:00 PM today, in the local timezone.
    4.  Try to find a time as soon as possible.
    5.  The reasoning should be concise and helpful.

    Please provide your answer in JSON format that adheres to the specified schema.
    `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Using a powerful model for complex reasoning
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: meetingProposalSchema,
      },
    });

    const jsonText = response.text.trim();
    const proposal: MeetingProposalResponse = JSON.parse(jsonText);
    
    // Basic validation
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
