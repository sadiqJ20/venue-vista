import React from 'react';

const PMCHeader = () => {
  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-xl border-b border-gray-200 z-50">
      {/* Additional shadow for depth */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Left side - PMC Logo */}
          <div className="flex-shrink-0">
            <img
              src="/logos/pmc-logo.jpg"
              alt="PMC Logo"
              className="w-auto object-contain transition-transform duration-300 hover:scale-105"
              style={{ height: '95px' }}
            />
          </div>

          {/* Right side - Partner Logos */}
          <div className="flex items-center gap-8">
            <img
              src="/logos/autonomous-logo.png"
              alt="Autonomous Logo"
              className="w-auto object-contain transition-transform duration-300 hover:scale-105"
              style={{ height: '125px' }}
            />
            <img
              src="/logos/tuv-logo.png"
              alt="TUV Logo"
              className="w-auto object-contain transition-transform duration-300 hover:scale-105"
              style={{ height: '75px' }}
            />
            <img
              src="/assets/images/NBA logo3.png"
              alt="NBA Logo"
              className="w-auto object-contain transition-transform duration-300 hover:scale-105"
              style={{ height: '75px' }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default PMCHeader;