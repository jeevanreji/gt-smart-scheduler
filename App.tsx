import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SessionDetail from './components/SessionDetail';
import { User, Session, Location, Email, CalendarEvent, Booking } from './types';
import { MOCK_CALENDARS, AVAILABLE_ROOMS } from './constants';
import * as gmailService from './services/gmailService';
import * as geminiService from './services/geminiService';
import * as bookingService from './services/bookingService';
import { DottedLoader } from './components/icons/DottedLoader';

const App: React.FC = () => {
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [gapiError, setGapiError] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [sessions, setSessions] = useState<Session[]>(() => {
    const savedSessions = localStorage.getItem('sessions');
    return savedSessions ? JSON.parse(savedSessions) : [];
  });
   const [bookings, setBookings] = useState<Booking[]>(() => {
    const savedBookings = localStorage.getItem('bookings');
    return savedBookings ? JSON.parse(savedBookings) : [];
  });
  
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Services and Load Data
  useEffect(() => {
    bookingService.init(bookings);
    const initGoogleClient = async () => {
      try {
        await gmailService.initClient();
        setIsGapiLoaded(true);
        if (currentUser) {
            const refreshedUser = await gmailService.signIn(true);
            setCurrentUser(refreshedUser);
            const [userEmails, userEvents] = await Promise.all([
              gmailService.fetchEmails(4),
              gmailService.fetchCalendarEvents()
            ]);
            setEmails(userEmails);
            setCalendarEvents(userEvents);
        }
      } catch (error: any) {
        console.error("GAPI Init Error:", error);
        setGapiError(error.message || "Failed to initialize Google Services.");
        if (!error.message.includes("cancelled")) { // Don't clear user if they just closed the popup
            setCurrentUser(null);
            localStorage.removeItem('currentUser');
        }
      } finally {
        setIsLoading(false);
      }
    };
    initGoogleClient();
  }, []); // Run only on initial mount

  // Watch for location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('bookings', JSON.stringify(bookings));
    bookingService.init(bookings); // Keep the service in sync
  }, [bookings]);

  const handleLogin = async () => {
    try {
      const user = await gmailService.signIn();
      setCurrentUser(user);
      const [userEmails, userEvents] = await Promise.all([
        gmailService.fetchEmails(4),
        gmailService.fetchCalendarEvents()
      ]);
      setEmails(userEmails);
      setCalendarEvents(userEvents);
    } catch (error: any) {
      console.error("Login failed:", error);
      alert(error.message);
    }
  };

  const handleLogout = () => {
    gmailService.signOut();
    setCurrentUser(null);
    setEmails([]);
    setCalendarEvents([]);
    setActiveSessionId(null);
    // Only remove the user, keep sessions and bookings persistent
    localStorage.removeItem('currentUser');
  };

  const handleCreateSession = (name: string): string => {
    if (!currentUser) return '';
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name,
      participants: [currentUser],
      state: 'PENDING',
      readyStatus: { [currentUser.id]: 'PENDING' },
      excludedSlots: [],
    };
    setSessions(prev => [...prev, newSession]);
    return newSession.id;
  };

  const handleJoinSession = (sessionId: string) => {
    if (!currentUser) return;
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId && !s.participants.some(p => p.id === currentUser.id)) {
        return {
          ...s,
          participants: [...s.participants, currentUser],
          readyStatus: { ...s.readyStatus, [currentUser.id]: 'PENDING' },
        };
      }
      return s;
    }));
  };
  
  const scheduleMeeting = useCallback(async (session: Session) => {
    if (!session || !currentUser) return;

    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'PLANNING' } : s));
    
    const calendars = session.participants.reduce((acc, p) => {
      if (p.id === currentUser.id) {
        acc[p.id] = calendarEvents;
      } else {
        // For other users, we rely on mock data as we can't access their private calendars
        acc[p.id] = MOCK_CALENDARS[p.id] || [];
      }
      return acc;
    }, {} as Record<string, CalendarEvent[]>);

    const proposalResponse = await geminiService.findBestMeetingTime(
      session.participants,
      calendars,
      AVAILABLE_ROOMS,
      bookings,
      userLocation,
      session.excludedSlots
    );

    if (proposalResponse) {
      const proposedRoom = AVAILABLE_ROOMS.find(r => r.id === proposalResponse.roomId);
      if (proposedRoom) {
        setSessions(prev => prev.map(s => s.id === session.id ? {
          ...s,
          state: 'PROPOSED',
          proposal: {
            room: proposedRoom,
            startTime: proposalResponse.startTime,
            endTime: proposalResponse.endTime,
            reasoning: proposalResponse.reasoning,
            responses: {},
          }
        } : s));
      } else {
         setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'CANCELED' } : s));
      }
    } else {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'CANCELED' } : s));
    }
  }, [currentUser, calendarEvents, bookings, userLocation]);

  const handleSetReady = useCallback((sessionId: string, userId: string, status: 'READY' | 'PENDING') => {
    setSessions(prev => {
      const newSessions = prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, readyStatus: { ...s.readyStatus, [userId]: status } };
        }
        return s;
      });

      const updatedSession = newSessions.find(s => s.id === sessionId);
      if (updatedSession) {
        const allReady = updatedSession.participants.every(p => updatedSession.readyStatus[p.id] === 'READY');
        if (allReady && updatedSession.state === 'PENDING') {
          scheduleMeeting(updatedSession);
        }
        else if(allReady && updatedSession.state === 'PROPOSED') {
          // If all participants are ready and the state is PROPOSED, we can confirm the booking
          handleProposalResponse(updatedSession.id, currentUser.id, true);
        }
      }
      return newSessions;
    });
  }, [scheduleMeeting]);

  
  const handleProposalResponse = (sessionId: string, userId: string, accepted: boolean) => {
  setSessions(prevSessions => {
    // 1️⃣ Update the response for this user
    const updatedSessions = prevSessions.map(s => {
      if (s.id === sessionId && s.proposal) {
        return {
          ...s,
          proposal: {
            ...s.proposal,
            responses: { ...s.proposal.responses, [userId]: accepted },
          },
        };
      }
      return s;
    });

    const session = updatedSessions.find(s => s.id === sessionId);
    if (!session || !session.proposal) return updatedSessions;

    const allResponded = session.participants.every(p => session.proposal!.responses[p.id] !== undefined);
    if (!allResponded) return updatedSessions;

    const allAccepted = session.participants.every(p => session.proposal!.responses[p.id] === true);

    if (allAccepted) {
      // ✅ Everyone accepted — confirm the booking
      const newBooking = bookingService.bookRoom(
        session.proposal.room,
        session.proposal.startTime,
        session.proposal.endTime,
        session.participants
      );

      if (newBooking) {
        // Booking succeeded
        setBookings(prev => [...prev, newBooking]);
        return updatedSessions.map(s =>
          s.id === sessionId
            ? { ...s, state: 'CONFIRMED', proposal: undefined }
            : s
        );
      } else {
        console.warn("Conflict during booking — replan.");
        // Booking failed: fall through to reschedule logic below
      }
    }

    // ❌ Not all accepted or booking failed — reschedule
    const rejectedSlot = {
      startTime: session.proposal.startTime,
      endTime: session.proposal.endTime,
    };

    return updatedSessions.map(s =>
      s.id === sessionId
        ? {
            ...s,
            state: 'PLANNING',
            proposal: undefined,
            excludedSlots: [...s.excludedSlots, rejectedSlot],
            readyStatus: s.participants.reduce(
              (acc, p) => ({ ...acc, [p.id]: 'PENDING' }),
              {}
            ),
          }
        : s
    );
  });
};



  const activeSession = sessions.find(s => s.id === activeSessionId);
  
  if (isLoading) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900"><DottedLoader /><p className="mt-4 text-gray-400">Initializing Google Services...</p></div>;
  }
  
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} isGapiLoaded={isGapiLoaded} gapiError={gapiError} />;
  }

  if (activeSession) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <SessionDetail
          session={activeSession}
          currentUser={currentUser}
          userLocation={userLocation}
          onBack={() => setActiveSessionId(null)}
          onSetReady={handleSetReady}
          onProposalResponse={handleProposalResponse}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Dashboard
        currentUser={currentUser}
        sessions={sessions}
        userLocation={userLocation}
        emails={emails}
        calendarEvents={calendarEvents}
        onCreateSession={handleCreateSession}
        onJoinSession={handleJoinSession}
        onViewSession={setActiveSessionId}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;