import { useState } from "react";
import {
  getWordDescription,
  languageMeta,
  supportedLanguages,
  type LanguageCode,
} from "./decks/wordDescriptions";

export function WordHelp({ word }: { word: string }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const description = getWordDescription(word);

  return (
    <>
      <button
        type="button"
        className="help-button"
        title="What does this word mean?"
        aria-label="Explain this word"
        onClick={() => setOpen(true)}
      >
        ?
      </button>

      {open && (
        <div className="help-overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="help-window" onClick={(event) => event.stopPropagation()}>
            <div className="help-header">
              <button
                type="button"
                className="help-close"
                title="Close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
              <div className="help-flags">
                {supportedLanguages.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`help-flag${code === language ? " is-active" : ""}`}
                    title={languageMeta[code].label}
                    aria-label={languageMeta[code].label}
                    aria-pressed={code === language}
                    onClick={() => setLanguage(code)}
                  >
                    {languageMeta[code].flag}
                  </button>
                ))}
              </div>
            </div>

            <h2 className="help-word">{word}</h2>
            <p className="help-description">
              {description
                ? description[language]
                : "No simple description is available for this word yet."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
