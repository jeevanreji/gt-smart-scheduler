import React, { useState, useEffect, useCallback } from 'react';
import { User, Session, View, Booking, Location, Email } from './types';
import { MOCK_CALENDARS, MOCK_EMAILS } from './constants';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SessionDetail from './components/SessionDetail';
import { getAvailableRooms, createBooking as apiCreateBooking, setBookings as setStoredBookings } from './services/bookingService';
import { findOptimalSlot } from './services/geminiService';
import { DottedLoader } from './components/icons/DottedLoader';
import { initGoogleClient, handleSignIn, handleSignOut, fetchEmails } from './services/gmailService';

// --- Persistence Helpers ---
const getInitialState = () => {
  try {
    const sessions = localStorage.getItem('sessions');
    const bookings = localStorage.getItem('bookings');
    
    const initialState = {
      sessions: sessions ? JSON.parse(sessions) : [],
      bookings: bookings ? JSON.parse(bookings).map((b: any) => ({...b, startTime: new Date(b.startTime), endTime: new Date(b.endTime)})) : [],
    };
    setStoredBookings(initialState.bookings); // Sync booking service
    return initialState;
  } catch (error) {
    console.error("Failed to parse from localStorage", error);
    return { sessions: [], bookings: [] };
  }
};


const App: React.FC = () => {
  const [initialState] = useState(getInitialState);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>(initialState.sessions);
  const [currentView, setCurrentView] = useState<View>({ name: 'dashboard' });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [bookings, setBookings] = useState<Booking[]>(initialState.bookings);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [gapiError, setGapiError] = useState<string | null>(null);


  // --- Save state to localStorage on change ---
  useEffect(() => {
    try {
      localStorage.setItem('sessions', JSON.stringify(sessions));
      localStorage.setItem('bookings', JSON.stringify(bookings));
      setStoredBookings(bookings); // Keep booking service in sync
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [sessions, bookings]);

  // --- Initialize Google Client ---
  useEffect(() => {
    setLoadingMessage('Initializing Google Services...');
    initGoogleClient()
      .then(user => {
        if (user) {
          setCurrentUser(user);
          setEmails(MOCK_EMAILS[user.id] || []);
        }
        setIsGapiLoaded(true);
      })
      .catch(error => {
        console.error("GAPI Initialization Error:", error);
        setGapiError(error.message || 'An unknown error occurred during Google initialization.');
      })
      .finally(() => {
        setIsLoading(false);
        setLoadingMessage('');
      });
  }, []);

  // Fetch emails when user logs in
  useEffect(() => {
      if(currentUser && isGapiLoaded && !gapiError) {
          const loadEmails = async () => {
              setLoadingMessage('Fetching latest emails...');
              setIsLoading(true);
              const fetchedEmails = await fetchEmails();
              setEmails(fetchedEmails);
              setIsLoading(false);
              setLoadingMessage('');
          }
          //loadEmails(); We'll stick to mock emails for now to avoid auth issues.
      }
  }, [currentUser, isGapiLoaded, gapiError]);

  // Get user's live location
  useEffect(() => {
    let watchId: number;
    if (currentUser) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          setUserLocation({ lat: 33.7756, lng: -84.3963 });
        },
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [currentUser]);


  const handleLogin = async () => {
    try {
        const user = await handleSignIn();
        if (user) {
            setCurrentUser(user);
            setEmails(MOCK_EMAILS[user.id] || []);
        }
    } catch (error) {
        console.error("Sign in failed:", error);
        setGapiError("Failed to sign in. Please try again.");
    }
  };

  const handleLogout = () => {
    handleSignOut(() => {
        setCurrentUser(null);
        setCurrentView({ name: 'dashboard' });
        setUserLocation(null);
        setEmails([]);
    });
  };

  const createNewSession = (name: string): string => {
    if (!currentUser) return '';
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name,
      participants: [currentUser],
      readyStatus: { [currentUser.id]: 'PENDING' },
      state: 'PENDING',
      hostId: currentUser.id,
    };
    setSessions(prev => [...prev, newSession]);
    return newSession.id;
  };

  const joinSession = (sessionId: string) => {
    if (!currentUser) return;
    setSessions(prev =>
      prev.map(s => {
        if (s.id === sessionId && !s.participants.find(p => p.id === currentUser.id)) {
          return {
            ...s,
            participants: [...s.participants, currentUser],
            readyStatus: { ...s.readyStatus, [currentUser.id]: 'PENDING' },
          };
        }
        return s;
      })
    );
  };

  const setReadyStatus = (sessionId: string, userId: string, status: 'READY' | 'PENDING') => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, readyStatus: { ...s.readyStatus, [userId]: status } };
        }
        return s;
      })
    );
  };

  const runCoordinatorAgent = useCallback(async (session: Session) => {
    setIsLoading(true);
    setLoadingMessage('Coordinator Agent activated. Analyzing schedules...');
    const participantAvailabilities = session.participants.map(p => ({
      userId: p.id,
      name: p.name,
      calendar: MOCK_CALENDARS[p.id] || [], // Still using mock calendars for now
    }));
    const availableRooms = getAvailableRooms(new Date(), session.participants.length);
    if (availableRooms.length === 0) {
      setLoadingMessage('No rooms available. Please try again later.');
      setTimeout(() => setIsLoading(false), 3000);
      return;
    }
    setLoadingMessage('Contacting Gemini 2.5 Pro...');
    try {
      const proposal = await findOptimalSlot(participantAvailabilities, availableRooms);
      if (proposal?.room) {
        setLoadingMessage('Proposal received. Notifying participants...');
        setSessions(prev =>
          prev.map(s => s.id === session.id ? { ...s, state: 'PROPOSED', proposal: { ...proposal, responses: {} } } : s)
        );
      } else {
        throw new Error('Gemini could not determine an optimal slot.');
      }
    } catch (error) {
      console.error(error);
      setLoadingMessage('Error: Agent failed to find a suitable time.');
    } finally {
        setTimeout(() => setIsLoading(false), 1500);
    }
  }, []);

  useEffect(() => {
    sessions.forEach(session => {
      if (session.state === 'PENDING') {
        const allReady = session.participants.every(p => session.readyStatus[p.id] === 'READY');
        if (allReady && session.participants.length > 1) {
          setSessions(prev =>
            prev.map(s => (s.id === session.id ? { ...s, state: 'PLANNING' } : s))
          );
          runCoordinatorAgent(session);
        }
      }
    });
  }, [sessions, runCoordinatorAgent]);


  const handleProposalResponse = (sessionId: string, userId: string, accepted: boolean) => {
    let targetSession: Session | undefined;
    const updatedSessions = sessions.map(s => {
        if (s.id === sessionId && s.proposal) {
            const newProposal = { ...s.proposal, responses: { ...s.proposal.responses, [userId]: accepted } };
            targetSession = { ...s, proposal: newProposal };
            return targetSession;
        }
        return s;
    });
    setSessions(updatedSessions);

    setTimeout(() => {
        if (targetSession?.proposal) {
            const { participants, proposal } = targetSession;
            const allResponded = participants.every(p => proposal.responses[p.id] !== undefined);
            if (allResponded) {
                const allAccepted = participants.every(p => proposal.responses[p.id]);
                if (allAccepted) {
                    setIsLoading(true);
                    setLoadingMessage('Consensus reached! Booking room...');
                    const booking = apiCreateBooking(targetSession.id, proposal.room.id, new Date(proposal.startTime), new Date(proposal.endTime));
                    setBookings(prev => [...prev, booking]);
                    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, state: 'CONFIRMED' } : s));
                    setTimeout(() => setIsLoading(false), 2000);
                } else {
                    setIsLoading(true);
                    setLoadingMessage('Proposal declined. Resetting session...');
                    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, state: 'PENDING', proposal: undefined, readyStatus: Object.fromEntries(s.participants.map(p => [p.id, 'PENDING'])) } : s));
                    setTimeout(() => setIsLoading(false), 2000);
                }
            }
        }
    }, 100);
  };

  const renderContent = () => {
    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} isGapiLoaded={isGapiLoaded} gapiError={gapiError} />;
    }
    if (currentView.name === 'session') {
      const session = sessions.find(s => s.id === currentView.sessionId);
      if (session) {
        return <SessionDetail session={session} currentUser={currentUser} userLocation={userLocation} onBack={() => setCurrentView({ name: 'dashboard' })} onSetReady={setReadyStatus} onProposalResponse={handleProposalResponse} />;
      }
    }
    return <Dashboard currentUser={currentUser} sessions={sessions} userLocation={userLocation} emails={emails} onCreateSession={createNewSession} onJoinSession={joinSession} onViewSession={(sessionId) => setCurrentView({ name: 'session', sessionId })} onLogout={handleLogout} />;
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 font-sans">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
          <DottedLoader />
          <p className="mt-4 text-lg text-gray-300 animate-pulse">{loadingMessage}</p>
        </div>
      )}
      <div className="max-w-7xl mx-auto p-4">{renderContent()}</div>
    </div>
  );
};

export default App;