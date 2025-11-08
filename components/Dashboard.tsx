import React, { useState } from 'react';
import { User, Session, Location, Email } from '../types';
import { CreateIcon, JoinIcon } from './icons/EditorIcons';
import { UserIcon } from './icons/UserIcon';
import MapComponent from './Map';
import { BuildingIcon } from './icons/BuildingIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import EmailClient from './EmailClient';
import { InboxIcon } from './icons/InboxIcon';

interface DashboardProps {
  currentUser: User;
  sessions: Session[];
  userLocation: Location | null;
  emails: Email[];
  onCreateSession: (name: string) => string;
  onJoinSession: (sessionId: string) => void;
  onViewSession: (sessionId: string) => void;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  sessions,
  userLocation,
  emails,
  onCreateSession,
  onJoinSession,
  onViewSession,
  onLogout,
}) => {
  const [sessionName, setSessionName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [activeTab, setActiveTab] = useState<'sessions' | 'inbox'>('sessions');
  const centerOfGT = { lat: 33.7756, lng: -84.3963 };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionName.trim()) {
      const newId = onCreateSession(sessionName.trim());
      onViewSession(newId);
      setSessionName('');
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      onJoinSession(joinId.trim());
      setJoinId('');
    }
  };
  
  const userSessions = sessions.filter(s => s.participants.some(p => p.id === currentUser.id));

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-cyan-400">GT Smart Scheduler</h1>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full">
              <UserIcon />
              <span className="text-sm font-medium">{currentUser.email}</span>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 bg-red-800 hover:bg-red-700 px-3 py-1 rounded-full transition-colors">
                <LogoutIcon />
                <span className="text-sm font-medium">Logout</span>
            </button>
        </div>
      </header>
      
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
            {/* Tabs */}
            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('sessions')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'sessions' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                        Sessions
                    </button>
                    <button onClick={() => setActiveTab('inbox')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'inbox' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                        <InboxIcon />
                        Inbox
                    </button>
                </nav>
            </div>

            {activeTab === 'sessions' && (
                <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Create Session */}
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><CreateIcon /> Create a New Session</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input
                            type="text"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            placeholder="e.g., AI Project Group"
                            className="w-full bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            />
                            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition duration-300">
                            Create Session
                            </button>
                        </form>
                        </div>

                        {/* Join Session */}
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><JoinIcon/> Join an Existing Session</h2>
                        <form onSubmit={handleJoin} className="space-y-4">
                            <input
                            type="text"
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value)}
                            placeholder="Enter session ID"
                            className="w-full bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition duration-300">
                            Join Session
                            </button>
                        </form>
                        </div>
                    </div>
              
                    {/* Session List */}
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Your Sessions</h2>
                        {userSessions.length > 0 ? (
                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                            {userSessions.map(session => (
                            <div key={session.id} onClick={() => onViewSession(session.id)} className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 cursor-pointer transition duration-300 flex justify-between items-center">
                                <div>
                                <h3 className="text-lg font-bold">{session.name}</h3>
                                <p className="text-sm text-gray-400">{session.participants.length} participant(s)</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                {
                                    PENDING: 'bg-yellow-500 text-black',
                                    PLANNING: 'bg-blue-500 text-white animate-pulse',
                                    PROPOSED: 'bg-purple-500 text-white',
                                    CONFIRMED: 'bg-green-500 text-white',
                                    CANCELED: 'bg-red-500 text-white',
                                }[session.state]
                                }`}>
                                {session.state}
                                </span>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <p className="text-gray-400 text-center py-8">You haven't joined any sessions yet.</p>
                        )}
                    </div>
                </div>
            )}
            {activeTab === 'inbox' && <EmailClient emails={emails} />}
        </div>

        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BuildingIcon /> Campus Map</h2>
            <div className="flex-grow rounded-lg overflow-hidden border border-gray-700 min-h-[50vh]">
                <MapComponent center={userLocation || centerOfGT} userLocation={userLocation} zoom={15.5} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;