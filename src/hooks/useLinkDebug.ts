/**
 * useLinkDebug - Stores debug state for coach-athlete linking diagnostics
 * 
 * Used by LinkAthleteModal, CoachDashboard and GlobalDebugBar
 */

import { create } from 'zustand';

interface LinkDebugState {
  lastUpsertOk: boolean | null;
  lastUpsertError: string | null;
  lastVerifyCount: number | null;
  lastLinksCount: number | null;
  lastJoinCount: number | null;
  lastProfilesSample: string | null;
  lastTimestamp: string | null;
  
  // Actions
  setUpsertResult: (ok: boolean, error: string | null) => void;
  setVerifyCount: (count: number) => void;
  setDiagnosticCounts: (links: number, join: number, profilesSample: string | null) => void;
  reset: () => void;
}

export const useLinkDebug = create<LinkDebugState>((set) => ({
  lastUpsertOk: null,
  lastUpsertError: null,
  lastVerifyCount: null,
  lastLinksCount: null,
  lastJoinCount: null,
  lastProfilesSample: null,
  lastTimestamp: null,

  setUpsertResult: (ok, error) => set({
    lastUpsertOk: ok,
    lastUpsertError: error,
    lastTimestamp: new Date().toISOString(),
  }),

  setVerifyCount: (count) => set({
    lastVerifyCount: count,
    lastTimestamp: new Date().toISOString(),
  }),

  setDiagnosticCounts: (links, join, profilesSample) => set({
    lastLinksCount: links,
    lastJoinCount: join,
    lastProfilesSample: profilesSample,
    lastTimestamp: new Date().toISOString(),
  }),

  reset: () => set({
    lastUpsertOk: null,
    lastUpsertError: null,
    lastVerifyCount: null,
    lastLinksCount: null,
    lastJoinCount: null,
    lastProfilesSample: null,
    lastTimestamp: null,
  }),
}));
