import { LANGUAGES, useI18n } from '../i18n';
import { GlobeIcon } from './Icons';

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t.app.language}>
      <GlobeIcon />
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          lang={l.id}
          className="lang-switch__btn"
          aria-pressed={lang === l.id}
          onClick={() => setLang(l.id)}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}
