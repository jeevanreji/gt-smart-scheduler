import React from 'react';
import { Email } from '../types';

interface EmailClientProps {
  emails: Email[];
}

const EmailClient: React.FC<EmailClientProps> = ({ emails }) => {

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Your Inbox</h2>
      <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-2">
        {emails.length > 0 ? (
          emails.map(email => (
            <div key={email.id} className="p-4 bg-gray-700 rounded-lg border-l-4 border-gray-600 hover:border-cyan-500 transition-colors">
              <div className="flex justify-between items-start">
                 <p className="font-bold text-gray-200">{email.sender}</p>
                 <p className="text-xs text-gray-400">{new Date(email.timestamp).toLocaleString()}</p>
              </div>
              <p className="text-sm font-semibold text-gray-300 mt-1">{email.subject}</p>
              <p className="text-sm text-gray-400 mt-1 truncate">{email.snippet}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-8">Inbox is empty or still loading.</p>
        )}
      </div>
    </div>
  );
};

export default EmailClient;