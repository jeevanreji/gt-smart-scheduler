import { GoogleGenAI, Type } from '@google/genai';
import { Room, CalendarEvent, Proposal } from '../types';

// Initialize AI client only if API key is available
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

if (!ai) {
  console.warn("API_KEY environment variable not set. Gemini API calls will be disabled.");
}

interface ParticipantAvailability {
  userId: string;
  name: string;
  calendar: CalendarEvent[];
}

const generatePrompt = (participants: ParticipantAvailability[], rooms: Room[]): string => {
  const today = new Date();
  const dateString = today.toDateString();
  const currentTime = today.toTimeString().split(' ')[0];

  const participantData = participants.map(p => `
- User: ${p.name} (ID: ${p.userId})
  Current Schedule (${dateString}):
  ${p.calendar.length > 0 ? p.calendar.map(e => `  - ${e.title} (${new Date(e.startTime).toLocaleTimeString()} - ${new Date(e.endTime).toLocaleTimeString()}), Priority: ${e.priority}`).join('\n') : '  - No scheduled events.'}
  `).join('');

  const roomData = rooms.map(r => `
- Room: ${r.name} at ${r.building} (ID: ${r.id})
  Capacity: ${r.capacity}
  Location Coords: { lat: ${r.location.lat}, lng: ${r.location.lng} }
  `).join('');

  return `
You are an expert, autonomous scheduling agent for Georgia Tech students. Your goal is to find the single best 1-hour meeting slot for a group of students today.

Current Date: ${dateString}
Current Time: ${currentTime}
Booking Hours: You can only book slots between 10:00 AM - 12:00 PM and 1:00 PM - 8:00 PM.

Analyze the following data:

1. PARTICIPANTS AND THEIR SCHEDULES:
${participantData}

2. AVAILABLE ROOMS:
${roomData}

YOUR TASK:
Based on all the provided data, determine the optimal 1-hour meeting time and location. 

Follow these reasoning steps:
1.  Identify common free time slots for ALL participants, respecting their existing HIGH priority events. LOW and MEDIUM priority events can be considered flexible if necessary, but avoiding them is better.
2.  From the common slots, select the one that is soonest but allows for reasonable travel time (assume students are on campus).
3.  Choose a room that is centrally located relative to the participants' likely locations (you don't have their live location, so make a logical guess based on building names like Klaus, Library, etc.). The room must have enough capacity.
4.  Formulate a concise reasoning for your choice.

Your final output must be a JSON object matching the provided schema. Do not include any text outside the JSON object.
`;
};

export const findOptimalSlot = async (participants: ParticipantAvailability[], rooms: Room[]): Promise<Proposal | null> => {
  if (!ai) {
    console.error("Gemini API key not configured. Cannot find optimal slot.");
    // Return a mock proposal for UI testing if API key is missing
    return new Promise(resolve => setTimeout(() => {
        const mockRoom = rooms[0];
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + 1);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        resolve({
            room: mockRoom,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            reasoning: "This is a mock proposal because the Gemini API key is not configured.",
            responses: {}
        });
    }, 1500));
  }

  const prompt = generatePrompt(participants, rooms);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roomId: { type: Type.STRING },
            startTime: { type: Type.STRING, description: "The start time of the meeting in ISO 8601 format." },
            endTime: { type: Type.STRING, description: "The end time of the meeting in ISO 8601 format." },
            reasoning: { type: Type.STRING, description: "A brief explanation for why this slot was chosen." }
          },
          required: ["roomId", "startTime", "endTime", "reasoning"]
        }
      }
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);

    const chosenRoom = rooms.find(r => r.id === result.roomId);
    if (!chosenRoom) {
      console.error("Gemini chose a room that doesn't exist:", result.roomId);
      return null;
    }

    return {
      room: chosenRoom,
      startTime: result.startTime,
      endTime: result.endTime,
      reasoning: result.reasoning,
      responses: {}
    };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return null;
  }
};