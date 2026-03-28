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

const DEBUG_SIM_TIME_KEY = 'DEBUG_SIMULATION_TIME';
const DEBUG_SIM_EVENT = 'debug-simulation-override';

function handleSimulateTempo() {
  const input = prompt('Tempo do simulado em segundos (ex: 5400 = 1h30m):');
  if (!input) return;
  const val = Number(input);
  if (isNaN(val) || val <= 0) { alert('Valor inválido'); return; }
  localStorage.setItem(DEBUG_SIM_TIME_KEY, String(val));
  window.dispatchEvent(new CustomEvent(DEBUG_SIM_EVENT));
  window.location.reload();
}

function handleSimulateSessao() {
  const input = prompt('Quantas sessões de treino adicionar?');
  if (!input) return;
  const count = Number(input);
  if (isNaN(count) || count <= 0 || count > 100) { alert('Valor inválido (1-100)'); return; }

  const STORAGE_KEY = 'outlier-benchmark-history';
  const raw = localStorage.getItem(STORAGE_KEY);
  const existing: any[] = raw ? JSON.parse(raw) : [];

  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i + 1));
    existing.push({
      workout_id: `debug-session-${Date.now()}-${i}`,
      block_id: `debug-block-${i}`,
      completed: true,
      time_in_seconds: 3600,
      created_at: d.toISOString(),
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  window.location.reload();
}

function handleResetAll() {
  if (!confirm('Zerar todas as sessões de treino? (localStorage será limpo e a página recarregada)')) return;
  localStorage.removeItem('outlier-benchmark-history');
  localStorage.removeItem(DEBUG_SIM_TIME_KEY);
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
}

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

  if (!auth || !isAllowed) return null;

  const { user, profile, loading } = auth;
  const getUserRole = () => !profile ? 'no-profile' : !user ? 'no-user' : 'authenticated';
  const getAuthStatus = () => loading ? 'loading' : user ? 'authenticated' : 'unauthenticated';
  const authStatus = getAuthStatus();
  const activeSimTime = localStorage.getItem(DEBUG_SIM_TIME_KEY);

  const qaItems = [
    { label: 'mode', value: 'QA', color: 'text-amber-400' },
    { label: 'role', value: getUserRole(), color: 'text-purple-400' },
    { label: 'uid', value: maskValue(userId, 4), color: 'text-blue-400' },
    { label: 'email', value: maskEmail(userEmail), color: 'text-blue-400' },
    { label: 'pathname', value: location.pathname, color: 'text-cyan-400' },
    { label: 'auth.status', value: authStatus, color: authStatus === 'authenticated' ? 'text-green-400' : 'text-red-400' },
  ];

  const linkItems = linkDebug.lastTimestamp ? [
    { label: 'upsertOk', value: String(linkDebug.lastUpsertOk ?? '—'), color: linkDebug.lastUpsertOk ? 'text-green-400' : linkDebug.lastUpsertOk === false ? 'text-red-400' : 'text-gray-400' },
    { label: 'verifyCount', value: String(linkDebug.lastVerifyCount ?? '—'), color: (linkDebug.lastVerifyCount ?? 0) > 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'linksCount', value: String(linkDebug.lastLinksCount ?? '—'), color: (linkDebug.lastLinksCount ?? 0) > 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'joinCount', value: String(linkDebug.lastJoinCount ?? '—'), color: (linkDebug.lastJoinCount ?? 0) > 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'fetchOk', value: String(linkDebug.lastFetchOk ?? '—'), color: linkDebug.lastFetchOk ? 'text-green-400' : linkDebug.lastFetchOk === false ? 'text-red-400' : 'text-gray-400' },
    { label: 'linkedAthletes', value: String(linkDebug.lastLinkedAthletesCount ?? '—'), color: (linkDebug.lastLinkedAthletesCount ?? 0) > 0 ? 'text-green-400' : 'text-amber-400' },
    { label: 'lastError', value: linkDebug.lastUpsertError?.slice(0, 30) || '—', color: linkDebug.lastUpsertError ? 'text-red-400' : 'text-gray-400' },
  ] : [];

  const ownerItems = [
    { label: 'auth.status', value: authStatus, color: authStatus === 'authenticated' ? 'text-green-400' : authStatus === 'loading' ? 'text-yellow-400' : 'text-red-400' },
    { label: 'user.id', value: maskValue(userId, 4), color: userId ? 'text-blue-400' : 'text-gray-500' },
    { label: 'user.email', value: maskEmail(userEmail), color: userEmail ? 'text-blue-400' : 'text-gray-500' },
    { label: 'profile.loaded', value: String(!!profile), color: profile ? 'text-green-400' : 'text-yellow-400' },
    { label: 'pathname', value: location.pathname, color: 'text-cyan-400' },
  ];

  const items = debugMode === 'qa' ? [...qaItems, ...linkItems] : [...ownerItems, ...linkItems];
  const isQA = debugMode === 'qa';
  const showExpanded = isQA ? true : isExpanded;

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '4px 8px', borderRadius: '4px', fontSize: '11px',
    cursor: 'pointer', border: '1px solid',
  };

  return (
    <div 
      style={{
        position: 'fixed', bottom: 0, left: 0, width: '100vw',
        minHeight: '48px', zIndex: 99999,
        background: isQA ? 'rgba(180, 83, 9, 0.95)' : 'rgba(0, 0, 0, 0.95)',
        borderTop: isQA ? '3px solid #f97316' : '2px solid rgba(234, 179, 8, 0.5)',
        fontFamily: 'monospace', fontSize: '12px',
      }}
    >
      {isQA && (
        <div style={{ background: '#f97316', color: 'black', padding: '4px 16px', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <AlertTriangle style={{ width: 18, height: 18 }} />
          <span>🔧 QA DEBUG BAR ATIVO 🔧</span>
          <AlertTriangle style={{ width: 18, height: 18 }} />
        </div>
      )}
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', color: isQA ? 'white' : '#facc15', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bug style={{ width: 16, height: 16 }} />
          <span style={{ fontWeight: 'bold' }}>DEBUG {isQA ? '(QA MODE)' : '(OWNER)'}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
          <span style={{ color: '#22d3ee' }}>{location.pathname}</span>
          {activeSimTime && (
            <span style={{ color: '#34d399', marginLeft: 8 }}>sim: {activeSimTime}s</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={(e) => { e.stopPropagation(); handleSimulateTempo(); }} style={{ ...btnStyle, background: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.5)' }}>
            🧪 Simular Tempo
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleSimulateSessao(); }} style={{ ...btnStyle, background: 'rgba(16, 185, 129, 0.3)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.5)' }}>
            🏋️ Simular Sessão
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleResetAll(); }} style={{ ...btnStyle, background: 'rgba(220, 38, 38, 0.3)', color: '#fca5a5', borderColor: 'rgba(220, 38, 38, 0.5)' }}>
            🗑 Zerar Sessões
          </button>
          {isQA && (
            <button onClick={(e) => { e.stopPropagation(); deactivateQA(); }} style={{ ...btnStyle, background: 'rgba(220, 38, 38, 0.3)', color: '#fca5a5', borderColor: 'rgba(220, 38, 38, 0.5)' }}>
              <X style={{ width: 12, height: 12 }} /> Desativar QA
            </button>
          )}
          {showExpanded ? <ChevronDown style={{ width: 16, height: 16 }} /> : <ChevronUp style={{ width: 16, height: 16 }} />}
        </div>
      </button>
      
      {showExpanded && (
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
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
