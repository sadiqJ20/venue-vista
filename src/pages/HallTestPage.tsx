import React from 'react';
import HallAvailabilityTest from '@/components/HallAvailabilityTest';
import HallStatusWidget from '@/components/HallStatusWidget';

const HallTestPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hall Availability Test</h1>
          <p className="text-gray-600">Test and verify hall booking availability logic</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <HallStatusWidget />
          </div>
          <div>
            <HallAvailabilityTest />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HallTestPage;

