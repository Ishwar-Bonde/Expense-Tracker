import React from 'react';

interface LoadingProps {
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ className }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center">
        <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 ${className || ''}`}></div>
        <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;
