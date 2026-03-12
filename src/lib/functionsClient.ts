import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase/client';

export interface AdminDeleteUserPayload {
  uid: string;
}

export interface MonthlySummaryPayload {
  uid: string;
  month: number;
  year: number;
}

export interface MonthlySummaryResponse {
  summary: string;
  stats: {
    totalCredits: number;
    targetCredits: number;
    entryCount: number;
    percent: number;
  };
  source: 'gemini' | 'fallback';
}

const adminDeleteUserCallable = httpsCallable<AdminDeleteUserPayload, { ok: boolean }>(functions, 'adminDeleteUser');
const generateMonthlySummaryCallable = httpsCallable<MonthlySummaryPayload, MonthlySummaryResponse>(functions, 'generateMonthlySummary');

export const adminDeleteUser = async (payload: AdminDeleteUserPayload) => {
  const result = await adminDeleteUserCallable(payload);
  return result.data;
};

export const generateMonthlySummary = async (payload: MonthlySummaryPayload) => {
  const result = await generateMonthlySummaryCallable(payload);
  return result.data;
};
