import React from 'react';
import { GoogleIcon } from './icons/GoogleIcon';

interface LoginScreenProps {
  onLogin: () => void;
  isGapiLoaded: boolean;
  gapiError: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isGapiLoaded, gapiError }) => {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-xl shadow-2xl space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Welcome to GT Smart Scheduler</h1>
          <p className="text-gray-400 mt-2">The intelligent agent for booking rooms.</p>
        </div>
        
        {gapiError ? (
          <div className="bg-red-900 border border-red-500 text-red-300 p-4 rounded-lg text-left">
            <h3 className="font-bold text-lg">Initialization Failed</h3>
            <p className="text-sm mt-2">{gapiError}</p>
            <p className="text-sm mt-2">
              Please ensure you have replaced the placeholder in <code className="bg-gray-700 px-1 rounded">services/gmailService.ts</code> with a valid Google Cloud Client ID.
            </p>
          </div>
        ) : (
          isGapiLoaded && (
            <button 
                onClick={onLogin} 
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 flex items-center justify-center gap-2"
            >
                <GoogleIcon />
                Sign in with Google
            </button>
          )
        )}
        <p className="text-xs text-gray-500">
            By signing in, you agree to allow this application to view your basic profile information and email address.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;