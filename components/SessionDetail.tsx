import React, { useState } from 'react';
import { Session, User, Location } from '../types';
// FIX: Import the renamed MapComponent.
import MapComponent from './Map';
import { UserIcon } from './icons/UserIcon';
import { BuildingIcon } from './icons/BuildingIcon';

interface SessionDetailProps {
  session: Session;
  currentUser: User;
  userLocation: Location | null;
  onBack: () => void;
  onSetReady: (sessionId: string, userId: string, status: 'READY' | 'PENDING') => void;
  onProposalResponse: (sessionId: string, userId: string, accepted: boolean) => void;
}

const SessionDetail: React.FC<SessionDetailProps> = ({ session, currentUser, userLocation, onBack, onSetReady, onProposalResponse }) => {
  const isCurrentUserReady = session.readyStatus[currentUser.id] === 'READY';
  const [showId, setShowId] = useState(false);
  const proposal = session.proposal;
  const userHasResponded = proposal?.responses[currentUser.id] !== undefined;

  const handleReadyToggle = () => {
    onSetReady(session.id, currentUser.id, isCurrentUserReady ? 'PENDING' : 'READY');
  };

  const centerOfGT = { lat: 33.7756, lng: -84.3963 };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300">&larr; Back to Dashboard</button>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold">{session.name}</h1>
                <p className="text-gray-400 mt-1">Session ID: <span className="font-mono bg-gray-700 px-2 py-1 rounded-md cursor-pointer" onClick={() => setShowId(!showId)}>{showId ? session.id : 'Click to show'}</span></p>
            </div>
             <span className={`px-3 py-1 text-sm font-bold rounded-full ${
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
      </div>

      {session.state === 'CONFIRMED' && proposal && (
          <div className="bg-green-900 border border-green-500 p-6 rounded-lg shadow-lg text-center">
              <h2 className="text-2xl font-bold text-green-300">✅ Meeting Confirmed!</h2>
              <p className="text-lg mt-2">
                  {proposal.room.name}, {proposal.room.building}
              </p>
              <p className="text-gray-300 mt-1">
                  {new Date(proposal.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(proposal.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="mt-4 h-64 rounded-lg overflow-hidden">
                {/* FIX: Use the renamed MapComponent. */}
                <MapComponent center={proposal.room.location} highlight={proposal.room.location} userLocation={userLocation} />
              </div>
          </div>
      )}

      {session.state === 'PROPOSED' && proposal && (
        <div className="bg-purple-900 border border-purple-500 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-purple-300">Agent Proposal Received!</h2>
          <p className="mt-2 text-gray-300 italic">"{proposal.reasoning}"</p>
          <div className="mt-4 bg-gray-800 p-4 rounded-lg">
            <p className="text-lg font-semibold">{proposal.room.name}, {proposal.room.building}</p>
            <p className="text-gray-400">
              {new Date(proposal.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
              {new Date(proposal.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="mt-4 h-64 rounded-lg overflow-hidden">
            {/* FIX: Use the renamed MapComponent. */}
            <MapComponent center={proposal.room.location} highlight={proposal.room.location} userLocation={userLocation} />
          </div>
          {!userHasResponded ? (
            <div className="mt-4 flex gap-4">
              <button onClick={() => onProposalResponse(session.id, currentUser.id, true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-md transition">Accept</button>
              <button onClick={() => onProposalResponse(session.id, currentUser.id, false)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition">Decline</button>
            </div>
          ) : (
            <p className="mt-4 text-center text-gray-300">Waiting for other participants to respond...</p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Participants</h2>
          <ul className="space-y-3">
            {session.participants.map(p => (
              <li key={p.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                <div className="flex items-center gap-3">
                  <UserIcon />
                  <span>{p.name} {p.id === currentUser.id && '(You)'}</span>
                </div>
                <div className="flex items-center gap-2">
                    {session.state === 'PROPOSED' && proposal && (
                        <span className={`text-xs font-bold ${proposal.responses[p.id] === true ? 'text-green-400' : proposal.responses[p.id] === false ? 'text-red-400' : 'text-yellow-400'}`}>
                           {proposal.responses[p.id] === true ? 'Accepted' : proposal.responses[p.id] === false ? 'Declined' : 'Pending'}
                        </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${session.readyStatus[p.id] === 'READY' ? 'bg-green-500 text-white' : 'bg-gray-500 text-gray-200'}`}>
                      {session.readyStatus[p.id]}
                    </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="md:col-span-3 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
           <div className="flex-grow space-y-4">
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><BuildingIcon /> Campus Map</h2>
                <div className="h-64 md:h-80 rounded-lg overflow-hidden border border-gray-700">
                    {/* FIX: Use the renamed MapComponent. */}
                    <MapComponent center={userLocation || centerOfGT} userLocation={userLocation} zoom={15.5} />
                </div>
           </div>
           <div className="mt-6">
               {session.state === 'PENDING' && (
                 <>
                  <h2 className="text-xl font-semibold mb-4">Ready to Schedule?</h2>
                  <p className="text-gray-400 mb-6 text-center">
                    When everyone is ready, the Coordinator Agent will start finding the best time and place to meet.
                  </p>
                  <button
                    onClick={handleReadyToggle}
                    className={`w-full text-white font-bold py-4 px-4 rounded-md transition duration-300 text-lg ${isCurrentUserReady ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {isCurrentUserReady ? 'Set to Not Ready' : 'I\'m Ready!'}
                  </button>
                 </>
               )}
               {session.state !== 'PENDING' && (
                 <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">Agent Status: {session.state}</h2>
                    <p className="text-gray-400">
                        { session.state === 'PLANNING' && 'The agent is currently analyzing schedules and finding the best slot.' }
                        { session.state === 'PROPOSED' && 'A proposal has been sent. Please check above and respond.' }
                        { session.state === 'CONFIRMED' && 'Your meeting is booked! Details are shown above.' }
                    </p>
                 </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
