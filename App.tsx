
import React, { useState } from 'react';
import { View } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ScopeOfWork from './components/ScopeOfWork';
import ApiPlayground from './components/ApiPlayground';
import LiveVoiceInterface from './components/LiveVoiceInterface';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import GeminiStudio from './components/GeminiStudio';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard />;
      case View.SCOPE_OF_WORK:
        return <ScopeOfWork />;
      case View.API_PLAYGROUND:
        return <ApiPlayground />;
      case View.LIVE_DEMO:
        return <LiveVoiceInterface />;
      case View.ARCHITECTURE:
        return <ArchitectureDiagram />;
      case View.GEMINI_STUDIO:
        return <GeminiStudio />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#ededed] overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto animate-fadeIn">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
