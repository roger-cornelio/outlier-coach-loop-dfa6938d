/**
 * GlobalDebugBar - Debug bar global que funciona em QUALQUER rota
 * 
 * Esta versão é autônoma e busca seus próprios dados do auth/profile.
 * Renderizada diretamente no App.tsx, fora de qualquer container.
 * 
 * Modos:
 * - Owner Mode: dados completos para roger.bm2016@gmail.com
 * - QA Mode: dados limitados/mascarados para qualquer usuário (dev/preview only)
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown, Bug, X, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDebugAllowed } from '@/hooks/useDebugAllowed';
import { useAuthSafe } from '@/hooks/useAuth';
import { useLinkDebug } from '@/hooks/useLinkDebug';

export function GlobalDebugBar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();
  const { 
    isAllowed, 
    debugMode, 
    isQAActive, 
    deactivateQA, 
    maskValue, 
    maskEmail, 
    userEmail,
    userId 
  } = useDebugAllowed();
  const auth = useAuthSafe();
  const linkDebug = useLinkDebug();

  // Desativar completamente em /app (dashboard do atleta) para evitar re-renders
  const isAthleteRoute = location.pathname === '/app' || location.pathname.startsWith('/app/');
  
  // Only show for allowed users with debug flag, and NOT on athlete routes
  // Also hide if auth context is not available yet
  if (!auth || !isAllowed || isAthleteRoute) {
    return null;
  }

  const { user, profile, loading } = auth;

  // Get user role - simplified detection
  const getUserRole = () => {
    if (!profile) return 'no-profile';
    if (!user) return 'no-user';
    return 'authenticated';
  };

  // Get auth status
  const getAuthStatus = () => {
    if (loading) return 'loading';
    if (user) return 'authenticated';
    return 'unauthenticated';
  };

  const authStatus = getAuthStatus();

  // QA Mode: limited data - always expanded, highly visible
  const qaItems = [
    { label: 'mode', value: 'QA', color: 'text-amber-400' },
    { label: 'role', value: getUserRole(), color: 'text-purple-400' },
    { label: 'uid', value: maskValue(userId, 4), color: 'text-blue-400' },
    { label: 'email', value: maskEmail(userEmail), color: 'text-blue-400' },
    { label: 'pathname', value: location.pathname, color: 'text-cyan-400' },
    { label: 'auth.status', value: authStatus, color: authStatus === 'authenticated' ? 'text-green-400' : 'text-red-400' },
  ];

  // Link debug items (only show if there's data)
  const linkItems = linkDebug.lastTimestamp ? [
    { label: 'upsertOk', value: String(linkDebug.lastUpsertOk ?? '—'), color: linkDebug.lastUpsertOk ? 'text-green-400' : linkDebug.lastUpsertOk === false ? 'text-red-400' : 'text-gray-400' },
    { label: 'verifyCount', value: String(linkDebug.lastVerifyCount ?? '—'), color: (linkDebug.lastVerifyCount ?? 0) > 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'linksCount', value: String(linkDebug.lastLinksCount ?? '—'), color: (linkDebug.lastLinksCount ?? 0) > 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'joinCount', value: String(linkDebug.lastJoinCount ?? '—'), color: (linkDebug.lastJoinCount ?? 0) > 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'fetchOk', value: String(linkDebug.lastFetchOk ?? '—'), color: linkDebug.lastFetchOk ? 'text-green-400' : linkDebug.lastFetchOk === false ? 'text-red-400' : 'text-gray-400' },
    { label: 'linkedAthletes', value: String(linkDebug.lastLinkedAthletesCount ?? '—'), color: (linkDebug.lastLinkedAthletesCount ?? 0) > 0 ? 'text-green-400' : 'text-amber-400' },
    { label: 'lastError', value: linkDebug.lastUpsertError?.slice(0, 30) || '—', color: linkDebug.lastUpsertError ? 'text-red-400' : 'text-gray-400' },
  ] : [];

  // Owner Mode: more data
  const ownerItems = [
    { label: 'auth.status', value: authStatus, color: authStatus === 'authenticated' ? 'text-green-400' : authStatus === 'loading' ? 'text-yellow-400' : 'text-red-400' },
    { label: 'user.id', value: maskValue(userId, 4), color: userId ? 'text-blue-400' : 'text-gray-500' },
    { label: 'user.email', value: maskEmail(userEmail), color: userEmail ? 'text-blue-400' : 'text-gray-500' },
    { label: 'profile.loaded', value: String(!!profile), color: profile ? 'text-green-400' : 'text-yellow-400' },
    { label: 'pathname', value: location.pathname, color: 'text-cyan-400' },
  ];

  const items = debugMode === 'qa' ? [...qaItems, ...linkItems] : [...ownerItems, ...linkItems];
  const isQA = debugMode === 'qa';

  // Force expanded in QA mode
  const showExpanded = isQA ? true : isExpanded;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100vw',
        minHeight: '48px',
        zIndex: 99999,
        background: isQA ? 'rgba(180, 83, 9, 0.95)' : 'rgba(0, 0, 0, 0.95)',
        borderTop: isQA ? '3px solid #f97316' : '2px solid rgba(234, 179, 8, 0.5)',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      {/* QA Mode: Large visual marker */}
      {isQA && (
        <div 
          style={{
            background: '#f97316',
            color: 'black',
            padding: '4px 16px',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle style={{ width: 18, height: 18 }} />
          <span>🔧 QA DEBUG BAR ATIVO 🔧</span>
          <AlertTriangle style={{ width: 18, height: 18 }} />
        </div>
      )}
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          color: isQA ? 'white' : '#facc15',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bug style={{ width: 16, height: 16 }} />
          <span style={{ fontWeight: 'bold' }}>
            DEBUG {isQA ? '(QA MODE)' : '(OWNER)'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
          <span style={{ color: '#22d3ee' }}>{location.pathname}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!confirm('Zerar todas as sessões de treino? (localStorage será limpo e a página recarregada)')) return;
              localStorage.removeItem('outlier-benchmark-history');
              const raw = localStorage.getItem('outlier-store-v2');
              if (raw) {
                try {
                  const store = JSON.parse(raw);
                  if (store.state) {
                    store.state.workoutResults = [];
                    localStorage.setItem('outlier-store-v2', JSON.stringify(store));
                  }
                } catch {}
              }
              window.location.reload();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'rgba(220, 38, 38, 0.3)',
              color: '#fca5a5',
              borderRadius: '4px',
              fontSize: '11px',
              border: '1px solid rgba(220, 38, 38, 0.5)',
              cursor: 'pointer',
            }}
          >
            🗑 Zerar Sessões
          </button>
          {isQA && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deactivateQA();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(220, 38, 38, 0.3)',
                color: '#fca5a5',
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid rgba(220, 38, 38, 0.5)',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: 12, height: 12 }} />
              Desativar QA
            </button>
          )}
          {showExpanded ? (
            <ChevronDown style={{ width: 16, height: 16 }} />
          ) : (
            <ChevronUp style={{ width: 16, height: 16 }} />
          )}
        </div>
      </button>
      
      {showExpanded && (
        <div 
          style={{
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px 24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {items.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}:</span>
              <span className={item.color}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
