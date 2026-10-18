import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { UnsupportedFileError } from '../lib/fileio';
import { InvalidKeyFileError, PassphraseRequiredError, WrongPassphraseError } from '../lib/keyfile';
import { ar } from './ar';
import { en, type Messages } from './en';

export type { Messages };

export type Lang = 'en' | 'ar';

/** Each language is listed by its own name, so people can find theirs whatever is currently shown. */
export const LANGUAGES: { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'ar', name: 'العربية' },
];

export const MESSAGES: Record<Lang, Messages> = { en, ar };

const STORAGE_KEY = 'aisa-anonymizer.language';

const isLang = (value: unknown): value is Lang => value === 'en' || value === 'ar';

/** The language chosen before in this browser, else the browser's preferred language, else English. */
export function initialLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage unavailable: fall through */
  }
  for (const tag of globalThis.navigator?.languages ?? []) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

// Only a per-browser convenience; the browser's language is used again if storage is unavailable.
function saveLanguage(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

interface I18n {
  lang: Lang;
  t: Messages;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLanguage);
  const t = MESSAGES[lang];

  // Before paint, so the page never flashes in the wrong direction.
  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    document.title = t.app.title;
  }, [lang, t]);

  const value = useMemo<I18n>(
    () => ({
      lang,
      t,
      setLang: (next) => {
        saveLanguage(next);
        setLangState(next);
      },
    }),
    [lang, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <LanguageProvider>.');
  return context;
}

/** Message for a spreadsheet that could not be read. */
export function fileErrorText(t: Messages, error: unknown): string {
  if (error instanceof UnsupportedFileError) return t.fileErrors[error.code];
  // Errors from the spreadsheet library are technical and English-only, so they go after a plain message.
  if (error instanceof Error && error.message) return `${t.fileErrors.unreadable} (${error.message})`;
  return t.fileErrors.unreadable;
}

/** Message for a key file that could not be opened. */
export function keyErrorText(t: Messages, error: unknown): string {
  const messages = t.reidentify.keyErrors;
  if (error instanceof PassphraseRequiredError) return messages.passphraseRequired;
  if (error instanceof WrongPassphraseError) return messages.wrongPassphrase;
  if (error instanceof InvalidKeyFileError) return messages[error.code];
  return messages.unreadable;
}
