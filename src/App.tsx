import { useState } from 'react';
import { LandingScreen } from './pages/LandingScreen';
import { SetupScreen } from './pages/SetupScreen';
import { InterviewScreen } from './pages/InterviewScreen';
import { RecapScreen } from './pages/RecapScreen';
import type { AppScreen, InterviewConfig, SessionData } from './types';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  if (screen === 'landing') {
    return <LandingScreen onEnter={() => setScreen('setup')} />;
  }

  if (screen === 'interview' && config) {
    return (
      <InterviewScreen
        config={config}
        onEnd={(data) => {
          setSessionData(data);
          setScreen('recap');
        }}
      />
    );
  }

  if (screen === 'recap' && sessionData) {
    return (
      <RecapScreen
        sessionData={sessionData}
        onReset={() => {
          setSessionData(null);
          setConfig(null);
          setScreen('setup');
        }}
      />
    );
  }

  // setup (default after landing)
  return (
    <SetupScreen
      onBack={() => setScreen('landing')}
      onStart={(c) => {
        setConfig(c);
        setScreen('interview');
      }}
    />
  );
}
