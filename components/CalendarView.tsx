import React from 'react';
import { CalendarEvent } from '../types';

interface CalendarViewProps {
  events: CalendarEvent[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ events }) => {

  const formatTime = (isoString: string) => {
      // Check if it's an all-day event (date only)
      if (isoString.length === 10) return "All Day";
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
        {events.length > 0 ? (
          events.map((event, index) => (
            <div key={index} className="p-3 bg-gray-700 rounded-lg border-l-4 border-indigo-500">
              <p className="font-semibold text-gray-200">{event.title}</p>
              <p className="text-sm text-gray-400 mt-1">
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-8">No events on your calendar for today.</p>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
