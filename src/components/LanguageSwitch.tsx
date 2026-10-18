import { LANGUAGES, useI18n } from '../i18n';

/**
 * One toggle for the language. It is laid out left to right whatever the page direction, so English is
 * always on the left and العربية on the right, and the header keeps it in the same corner in every language.
 */
export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  const index = LANGUAGES.findIndex((l) => l.id === lang);
  const next = LANGUAGES[(index + 1) % LANGUAGES.length];
  return (
    <div className="app-header__lang" dir="ltr">
      <button
        className="lang-toggle"
        onClick={() => setLang(next.id)}
        aria-label={t.app.switchLanguage}
        title={t.app.switchLanguage}
      >
        <span className="lang-toggle__track">
          <span className="lang-toggle__thumb" style={{ transform: `translateX(${index * 100}%)` }} />
          {LANGUAGES.map((l) => (
            <span key={l.id} lang={l.id} className="lang-toggle__label" data-active={l.id === lang}>
              {l.name}
            </span>
          ))}
        </span>
      </button>
    </div>
  );
}
