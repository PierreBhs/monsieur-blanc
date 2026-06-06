import { useState } from "react";
import type { MrWhiteVariant } from "./mrWhiteVariants";

export function MrWhiteVariantHelp({ variant }: { variant: MrWhiteVariant }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="help-button"
        title="Who is pictured?"
        aria-label="About this artwork"
        onClick={() => setOpen(true)}
      >
        i
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
            </div>

            <h2 className="help-word">{variant.label}</h2>
            <p className="help-description">{variant.description}</p>
          </div>
        </div>
      )}
    </>
  );
}
