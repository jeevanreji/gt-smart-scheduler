import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SessionDetail from './components/SessionDetail';
import { User, Session, Location, Email, CalendarEvent, Booking } from './types';
import { MOCK_USERS, MOCK_CALENDARS, AVAILABLE_ROOMS } from './constants';
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
            // If user is already logged in from localStorage, refresh their token and data
            const refreshedUser = await gmailService.signIn(true); // Attempt silent sign-in
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
        // If silent sign-in fails, log the user out
        if(currentUser){
            handleLogout();
        }
      } finally {
        setIsLoading(false);
      }
    };
    initGoogleClient();
  }, []); // Run only once on mount

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('sessions', JSON.stringify(sessions));
    localStorage.setItem('bookings', JSON.stringify(bookings));
  }, [currentUser, sessions, bookings]);

  // Get user location
  useEffect(() => {
    navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => console.error("Error watching user location:", error)
    );
  }, []);

  const handleLogin = async () => {
    try {
      setGapiError(null);
      setIsLoading(true);
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
      setGapiError(error.message || "An error occurred during sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await gmailService.signOut();
    setCurrentUser(null);
    setActiveSessionId(null);
    setSessions([]);
    setBookings([]);
    setEmails([]);
    setCalendarEvents([]);
    localStorage.clear();
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
    setSessions(prevSessions => {
      const sessionExists = prevSessions.some(s => s.id === sessionId);
      if (!sessionExists) {
        alert("Session ID not found!");
        return prevSessions;
      }
      return prevSessions.map(s => {
        if (s.id === sessionId && !s.participants.some(p => p.id === currentUser.id)) {
           return {
              ...s,
              participants: [...s.participants, currentUser],
              readyStatus: { ...s.readyStatus, [currentUser.id]: 'PENDING' }
           };
        }
        return s;
      });
    });
    handleViewSession(sessionId);
  };
  
  const handleViewSession = (sessionId: string) => setActiveSessionId(sessionId);
  const handleBackToDashboard = () => setActiveSessionId(null);
  
  const runSchedulingAgent = useCallback(async (session: Session) => {
    if (!currentUser) return;
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'PLANNING' } : s));

    const participantCalendars = MOCK_USERS
      .filter(u => session.participants.some(p => p.id === u.id && u.id !== currentUser.id))
      .reduce((acc, user) => ({ ...acc, [user.id]: MOCK_CALENDARS[user.id] || [] }), {});
    
    const allCalendars = {
        ...participantCalendars,
        [currentUser.id]: calendarEvents,
    };

    const proposalData = await geminiService.findBestMeetingTime(
      session.participants,
      allCalendars,
      AVAILABLE_ROOMS,
      bookings,
      userLocation,
      session.excludedSlots
    );

    if (proposalData) {
        const room = AVAILABLE_ROOMS.find(r => r.id === proposalData.roomId);
        if (room) {
            setSessions(prev => prev.map(s => s.id === session.id ? {
                ...s,
                state: 'PROPOSED',
                proposal: { room, ...proposalData, responses: {} }
            } : s));
        } else {
             setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'CANCELED' } : s));
        }
    } else {
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'CANCELED' } : s));
    }
  }, [currentUser, calendarEvents, userLocation, bookings]);

  const handleSetReady = (sessionId: string, userId: string, status: 'READY' | 'PENDING') => {
    setSessions(prev => {
      const newSessions = prev.map(s => {
        if (s.id === sessionId) {
          const newReadyStatus = { ...s.readyStatus, [userId]: status };
          const updatedSession = { ...s, readyStatus: newReadyStatus };

          if (updatedSession.participants.every(p => newReadyStatus[p.id] === 'READY')) {
            setTimeout(() => runSchedulingAgent(updatedSession), 0);
          }
          return updatedSession;
        }
        return s;
      });
      return newSessions;
    });
  };
  
  const handleProposalResponse = (sessionId: string, userId: string, accepted: boolean) => {
     setSessions(prev => {
         return prev.map(s => {
             if (s.id === sessionId && s.proposal) {
                 const newResponses = { ...s.proposal.responses, [userId]: accepted };
                 let updatedSession = { ...s, proposal: { ...s.proposal, responses: newResponses } };

                 if (!accepted) {
                     // Reschedule immediately if anyone declines
                     updatedSession.state = 'PENDING';
                     const rejectedSlot = { startTime: s.proposal.startTime, endTime: s.proposal.endTime };
                     updatedSession.excludedSlots = [...(s.excludedSlots || []), rejectedSlot];
                     // Reset ready status to require a new handshake
                     updatedSession.participants.forEach(p => { updatedSession.readyStatus[p.id] = 'PENDING'; });
                     console.log(`[App] Proposal declined. Adding slot to exclusion list and resetting.`);
                     // The new "PENDING" state allows users to re-confirm readiness for a new search
                     return updatedSession;
                 }
                 
                 const allResponded = updatedSession.participants.every(p => newResponses[p.id] !== undefined);
                 if (allResponded) {
                     const allAccepted = updatedSession.participants.every(p => newResponses[p.id] === true);
                     if (allAccepted) {
                         updatedSession.state = 'CONFIRMED';
                         const newBooking = bookingService.bookRoom(s.proposal!.room, s.proposal!.startTime, s.proposal!.endTime, s.participants);
                         if (newBooking) setBookings(prevB => [...prevB, newBooking]);
                     }
                 }
                 return updatedSession;
             }
             return s;
         });
     });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const renderContent = () => {
    if (isLoading && !currentUser) { // Only show full-screen loader on initial load
      return <div className="flex items-center justify-center min-h-screen"><DottedLoader /></div>;
    }
    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} isGapiLoaded={isGapiLoaded} gapiError={gapiError} />;
    }
    if (activeSession) {
      return <SessionDetail session={activeSession} currentUser={currentUser} userLocation={userLocation} onBack={handleBackToDashboard} onSetReady={handleSetReady} onProposalResponse={handleProposalResponse} />;
    }
    return <Dashboard currentUser={currentUser} sessions={sessions} userLocation={userLocation} emails={emails} calendarEvents={calendarEvents} onCreateSession={handleCreateSession} onJoinSession={handleJoinSession} onViewSession={handleViewSession} onLogout={handleLogout} />;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">{renderContent()}</div>
    </div>
  );
};

export default App;