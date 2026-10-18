/**
 * Links and structure behind the guidance shown in the app. The guidance text itself is in each
 * language's translations (src/i18n/en.tsx, src/i18n/ar.tsx).
 *
 * This repository is public, so the guidance is written in our own words and only cites
 * publicly available documents. Do not paste text from confidential or draft policies into
 * this file or the translations. Link to them instead with VITE_POLICY_LINKS (see README), which
 * points to a copy that only signed-in staff can open.
 */

export interface PolicyLink {
  title: string;
  url: string;
  note?: string;
}

/** Step-by-step guide with screenshots, served from public/user-guide.pdf. */
export const USER_GUIDE_URL = './user-guide.pdf';

/** Video tutorial hosted on Google Drive (shared as "anyone with the link can view"). */
export const TUTORIAL_VIDEO = {
  embedUrl: 'https://drive.google.com/file/d/1NJ-rQtFkNzYq6U-obphonRq_R2neoWwj/preview',
  viewUrl: 'https://drive.google.com/file/d/1NJ-rQtFkNzYq6U-obphonRq_R2neoWwj/view',
};

/** Public policy documents. Their titles are in the translations. */
export const POLICY_URLS = {
  adekDigitalPolicy:
    'https://www.adek.gov.ae/-/media/Project/TAMM/ADEK/Policies/School-Policies/Health-safety-and-wellbeing/ADEK_S_Digital-Policy_EN.pdf',
  adekPolicies: 'https://adek.gov.ae/Education-System/Education-Policies/School-Policies',
  uaePdpl: 'https://uaelegislation.gov.ae/en/legislations/1972',
};

export type ChecklistGroup = 'data' | 'tool' | 'afterwards';

export type ChecklistId =
  | 'identifiers'
  | 'freetext'
  | 'sensitive'
  | 'combinations'
  | 'minimum'
  | 'approved-tool'
  | 'policy'
  | 'key'
  | 'oversight'
  | 'retention';

export interface ChecklistItem {
  id: ChecklistId;
  group: ChecklistGroup;
}

export const ANONYMIZE_CHECKLIST: ChecklistItem[] = [
  { id: 'identifiers', group: 'data' },
  { id: 'freetext', group: 'data' },
  { id: 'sensitive', group: 'data' },
  { id: 'combinations', group: 'data' },
  { id: 'minimum', group: 'data' },
  { id: 'approved-tool', group: 'tool' },
  { id: 'policy', group: 'tool' },
  { id: 'key', group: 'afterwards' },
  { id: 'oversight', group: 'afterwards' },
  { id: 'retention', group: 'afterwards' },
];

/** Extra links configured per deployment, e.g. to a staff-only copy of an internal policy. */
export function configuredPolicyLinks(): PolicyLink[] {
  const raw = import.meta.env.VITE_POLICY_LINKS as string | undefined;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is PolicyLink =>
        !!l && typeof l.title === 'string' && typeof l.url === 'string' && /^https:\/\//.test(l.url),
    );
  } catch {
    return [];
  }
}
