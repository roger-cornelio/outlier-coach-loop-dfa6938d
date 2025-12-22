/**
 * DEBUG PANEL - Owner + QA Debug Bar
 * 
 * Painel de diagnóstico para rastrear estado de onboarding/coach_style.
 * - Owner Mode: dados completos para roger.bm2016@gmail.com
 * - QA Mode: dados limitados/mascarados para qualquer usuário (dev/preview only)
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown, Bug, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDebugAllowed } from '@/hooks/useDebugAllowed';
import { useAuth } from '@/hooks/useAuth';

export interface DebugState {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  userId: string | null;
  profileLoaded: boolean;
  profileCoachStyle: string | null;
  firstSetupCompleted: boolean | null | undefined;
  isSetupComplete?: boolean;
  localCoachStyle: string | null;
  shouldShowOnboarding: boolean;
  currentRoute: string;
  currentView: string;
  lastRedirectReason: string;
  profileTrainingLevel?: string | null;
}

interface DebugPanelProps {
  state: DebugState;
}

export function DebugPanel({ state }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();
  const { 
    isAllowed, 
    debugMode, 
    isQAActive, 
    deactivateQA, 
    maskValue, 
    maskEmail, 
    userEmail 
  } = useDebugAllowed();
  const { profile } = useAuth();

  // Only show for allowed users with debug flag
  if (!isAllowed) {
    return null;
  }

  // Get user role from profile or context
  const getUserRole = () => {
    // This is a simplified role detection - adjust based on your actual role system
    if (!profile) return 'unknown';
    return 'user'; // Default role
  };

  // QA Mode: limited data
  const qaItems = [
    { label: 'mode', value: 'QA', color: 'text-amber-400' },
    { label: 'role', value: getUserRole(), color: 'text-purple-400' },
    { label: 'uid', value: maskValue(state.userId, 4), color: 'text-blue-400' },
    { label: 'email', value: maskEmail(userEmail), color: 'text-blue-400' },
    { label: 'pathname', value: location.pathname, color: 'text-cyan-400' },
    { label: 'auth.status', value: state.authStatus, color: state.authStatus === 'authenticated' ? 'text-green-400' : 'text-red-400' },
  ];

  // Owner Mode: full data
  const ownerItems = [
    { label: 'auth.status', value: state.authStatus, color: state.authStatus === 'authenticated' ? 'text-green-400' : state.authStatus === 'loading' ? 'text-yellow-400' : 'text-red-400' },
    { label: 'user.id', value: maskValue(state.userId, 4), color: state.userId ? 'text-blue-400' : 'text-gray-500' },
    { label: 'user.email', value: maskEmail(userEmail), color: userEmail ? 'text-blue-400' : 'text-gray-500' },
    { label: 'profileLoaded', value: String(state.profileLoaded), color: state.profileLoaded ? 'text-green-400' : 'text-yellow-400' },
    { label: 'first_setup_completed', value: String(state.firstSetupCompleted), color: state.firstSetupCompleted ? 'text-green-400' : 'text-orange-400' },
    { label: 'isSetupComplete', value: String(state.isSetupComplete ?? 'N/A'), color: state.isSetupComplete ? 'text-green-400' : 'text-orange-400' },
    { label: 'profile.coach_style', value: state.profileCoachStyle || 'null', color: state.profileCoachStyle ? 'text-green-400' : 'text-red-400' },
    { label: 'localCoachStyle', value: state.localCoachStyle || 'null', color: state.localCoachStyle ? 'text-purple-400' : 'text-gray-500' },
    { label: 'shouldShowOnboarding', value: String(state.shouldShowOnboarding), color: state.shouldShowOnboarding ? 'text-red-400' : 'text-green-400' },
    { label: 'currentRoute', value: location.pathname, color: 'text-cyan-400' },
    { label: 'currentView', value: state.currentView, color: 'text-cyan-400' },
    { label: 'lastRedirectReason', value: state.lastRedirectReason, color: state.lastRedirectReason === 'SETUP_COMPLETE' ? 'text-green-400' : state.lastRedirectReason === 'SETUP_INCOMPLETE' ? 'text-red-400' : 'text-yellow-300' },
  ];

  const items = debugMode === 'qa' ? qaItems : ownerItems;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 border-t border-yellow-500/50 text-xs font-mono">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span>DEBUG {debugMode === 'qa' ? '(QA)' : '(OWNER)'}</span>
          <span className="text-gray-500">|</span>
          <span className={state.shouldShowOnboarding ? 'text-orange-400' : 'text-green-400'}>
            onboarding: {state.shouldShowOnboarding ? 'YES' : 'NO'}
          </span>
          <span className="text-gray-500">|</span>
          <span className="text-yellow-300">{state.lastRedirectReason}</span>
        </div>
        <div className="flex items-center gap-2">
          {debugMode === 'qa' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deactivateQA();
              }}
              className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-[10px] transition-colors"
            >
              <X className="w-3 h-3" />
              Desativar QA
            </button>
          )}
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
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
