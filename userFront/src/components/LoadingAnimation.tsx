import React from 'react';
import { Bus } from 'lucide-react';

interface LoadingAnimationProps {
  isVisible: boolean;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 z-50 flex flex-col items-center justify-center">
      <div className="relative w-full max-w-md mx-auto mb-8">
        <div className="relative h-20 bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
          <div className="absolute inset-y-0 left-0 w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
            <Bus className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2 animate-[moveRight_2s_ease-in-out_infinite]">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl">
              <Bus className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md mx-auto">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
          Fetching Bus Data...
        </h2>
        <p className="text-gray-600 text-lg">Please wait while we load the latest bus information</p>
      </div>

      <div className="mt-8 flex space-x-3">
        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-bounce shadow-sm"></div>
        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
      </div>

      <style jsx>{`
        @keyframes moveRight {
          0% { transform: translateX(0) translateY(-50%); }
          50% { transform: translateX(320px) translateY(-50%); }
          100% { transform: translateX(0) translateY(-50%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingAnimation;