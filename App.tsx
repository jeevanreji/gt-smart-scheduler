import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import SessionDetail from './components/SessionDetail';
import { User, Session, Location, Email } from './types';
import { MOCK_USERS, MOCK_CALENDARS, AVAILABLE_ROOMS } from './constants';
import * as gmailService from './services/gmailService';
import * as geminiService from './services/geminiService';
import * as bookingService from './services/bookingService';
import { DottedLoader } from './components/icons/DottedLoader';

const App: React.FC = () => {
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [gapiError, setGapiError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Google Client
  useEffect(() => {
    const init = async () => {
      const { loaded, error } = await gmailService.initClient();
      setIsGapiLoaded(loaded);
      if (error) setGapiError(error);
      setIsLoading(false);
    };
    init();
  }, []);

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting user location:", error);
      }
    );
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const user = await gmailService.signIn();
      setCurrentUser(user);
      const userEmails = await gmailService.listEmails();
      setEmails(userEmails);
    } catch (error) {
      console.error("Login failed:", error);
      setGapiError("An error occurred during sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await gmailService.signOut();
    setCurrentUser(null);
    setActiveSessionId(null);
    setSessions([]);
    setEmails([]);
  };

  const handleCreateSession = (name: string): string => {
    if (!currentUser) return '';
    const newSession: Session = {
      id: `session-${Date.now()}`,
      name,
      participants: [currentUser],
      state: 'PENDING',
      readyStatus: { [currentUser.id]: 'PENDING' },
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
          // In a real app, you'd fetch the session details
          // For this mock, we'll just add the current user if they aren't in it.
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
  
  const handleViewSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleBackToDashboard = () => {
    setActiveSessionId(null);
  };
  
  const runSchedulingAgent = useCallback(async (session: Session) => {
    console.log(`[App] All users ready for session "${session.name}". Running scheduling agent...`);
    
    // 1. Set state to PLANNING
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'PLANNING' } : s));

    // 2. Gather data for Gemini
    const participantIds = session.participants.map(p => p.id);
    const calendars = Object.fromEntries(
        Object.entries(MOCK_CALENDARS).filter(([userId]) => participantIds.includes(userId))
    );

    // 3. Call Gemini service
    const proposalData = await geminiService.findBestMeetingTime(
        session.participants,
        calendars,
        AVAILABLE_ROOMS
    );

    // 4. Update session with proposal
    if (proposalData) {
        const room = AVAILABLE_ROOMS.find(r => r.id === proposalData.roomId);
        if (room) {
            setSessions(prev => prev.map(s => s.id === session.id ? {
                ...s,
                state: 'PROPOSED',
                proposal: {
                    room,
                    startTime: proposalData.startTime,
                    endTime: proposalData.endTime,
                    reasoning: proposalData.reasoning,
                    responses: {}, // Clear previous responses
                }
            } : s));
        } else {
             console.error("Gemini proposed a room that doesn't exist:", proposalData.roomId);
             setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'CANCELED' } : s));
        }
    } else {
        console.error("Failed to get proposal from Gemini.");
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, state: 'CANCELED' } : s));
    }
  }, []);

  const handleSetReady = (sessionId: string, userId: string, status: 'READY' | 'PENDING') => {
    setSessions(prev => {
      const newSessions = prev.map(s => {
        if (s.id === sessionId) {
          const newReadyStatus = { ...s.readyStatus, [userId]: status };
          const updatedSession = { ...s, readyStatus: newReadyStatus };

          // Check if all participants are now ready
          const allReady = updatedSession.participants.every(
            p => newReadyStatus[p.id] === 'READY'
          );

          if (allReady) {
            // Trigger agent asynchronously
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
         const newSessions = prev.map(s => {
             if (s.id === sessionId && s.proposal) {
                 const newResponses = { ...s.proposal.responses, [userId]: accepted };
                 const updatedSession = {
                     ...s,
                     proposal: { ...s.proposal, responses: newResponses }
                 };

                 // Check if all participants have responded
                 const allResponded = updatedSession.participants.every(p => newResponses[p.id] !== undefined);
                 
                 if (allResponded) {
                     const allAccepted = updatedSession.participants.every(p => newResponses[p.id] === true);
                     if (allAccepted) {
                         // Book the room!
                         updatedSession.state = 'CONFIRMED';
                         bookingService.bookRoom(updatedSession.proposal!.room, updatedSession.proposal!.startTime, updatedSession.proposal!.endTime, updatedSession.participants);
                     } else {
                         updatedSession.state = 'CANCELED';
                     }
                 }
                 return updatedSession;
             }
             return s;
         });
         return newSessions;
     });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const renderContent = () => {
    if (isLoading && !isGapiLoaded) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <DottedLoader />
        </div>
      );
    }
    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} isGapiLoaded={isGapiLoaded} gapiError={gapiError} />;
    }
    if (activeSession) {
      return <SessionDetail session={activeSession} currentUser={currentUser} userLocation={userLocation} onBack={handleBackToDashboard} onSetReady={handleSetReady} onProposalResponse={handleProposalResponse} />;
    }
    return <Dashboard currentUser={currentUser} sessions={sessions} userLocation={userLocation} emails={emails} onCreateSession={handleCreateSession} onJoinSession={handleJoinSession} onViewSession={handleViewSession} onLogout={handleLogout} />;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            {renderContent()}
        </div>
    </div>
  );
};

export default App;
