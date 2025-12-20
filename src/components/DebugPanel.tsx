/**
 * DEBUG PANEL - Development only
 * 
 * Painel de diagnóstico para rastrear estado de onboarding/coach_style.
 * Só aparece em ambiente de desenvolvimento.
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown, Bug } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export interface DebugState {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  userId: string | null;
  profileLoaded: boolean;
  profileCoachStyle: string | null;
  firstSetupCompleted: boolean | null;
  localCoachStyle: string | null;
  shouldShowOnboarding: boolean;
  currentRoute: string;
  currentView: string;
  lastRedirectReason: string;
}

interface DebugPanelProps {
  state: DebugState;
}

export function DebugPanel({ state }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const items = [
    { label: 'auth.status', value: state.authStatus, color: state.authStatus === 'authenticated' ? 'text-green-400' : state.authStatus === 'loading' ? 'text-yellow-400' : 'text-red-400' },
    { label: 'user.id', value: state.userId?.slice(0, 8) || 'null', color: state.userId ? 'text-blue-400' : 'text-gray-500' },
    { label: 'profileLoaded', value: String(state.profileLoaded), color: state.profileLoaded ? 'text-green-400' : 'text-yellow-400' },
    { label: 'first_setup_completed', value: String(state.firstSetupCompleted), color: state.firstSetupCompleted ? 'text-green-400' : 'text-orange-400' },
    { label: 'profile.coach_style', value: state.profileCoachStyle || 'null', color: state.profileCoachStyle ? 'text-green-400' : 'text-red-400' },
    { label: 'localCoachStyle', value: state.localCoachStyle || 'null', color: state.localCoachStyle ? 'text-purple-400' : 'text-gray-500' },
    { label: 'shouldShowOnboarding', value: String(state.shouldShowOnboarding), color: state.shouldShowOnboarding ? 'text-red-400' : 'text-green-400' },
    { label: 'currentRoute', value: location.pathname, color: 'text-cyan-400' },
    { label: 'currentView', value: state.currentView, color: 'text-cyan-400' },
    { label: 'lastRedirectReason', value: state.lastRedirectReason, color: state.lastRedirectReason === 'COACH_STYLE_PRESENT' ? 'text-green-400' : state.lastRedirectReason === 'COACH_STYLE_MISSING' ? 'text-red-400' : 'text-yellow-300' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 border-t border-yellow-500/50 text-xs font-mono">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span>DEBUG PANEL</span>
          <span className="text-gray-500">|</span>
          <span className={state.shouldShowOnboarding ? 'text-orange-400' : 'text-green-400'}>
            onboarding: {state.shouldShowOnboarding ? 'YES' : 'NO'}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-yellow-300">{state.lastRedirectReason}</span>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
      
      {isExpanded && (
        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-2 border-t border-gray-800">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-gray-500">{item.label}:</span>
              <span className={item.color}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
