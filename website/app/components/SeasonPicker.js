'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Season picker.
//
// Asks a first-time visitor which season they are thinking about, then repaints
// the site for that answer. The answer lives in a cookie, the root layout reads
// it, and everything downstream is server-rendered for one season only. That
// matters: the alternative (ship all four galleries and hide three with CSS)
// would quadruple the image weight of a page whose hero was only just brought
// down from 17.4 MB to 61 KB.
//
// Split into three parts because the nav has `backdrop-filter`, which makes it
// a containing block for fixed-position descendants. A modal rendered inside
// the nav would be positioned against the nav instead of the viewport, so the
// trigger and the dialog have to live in different places in the tree and share
// state through context.
//
// No data is sent anywhere. The cookie is first-party, holds one of four
// literal strings, and is read only by this app.
// ---------------------------------------------------------------------------

const SeasonContext = createContext(null);

function useSeasonPicker() {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error('Season components must be inside <SeasonProvider>');
  return ctx;
}

// Guests who already booked have a season. Do not interrupt them on the way to
// the door code.
const SUPPRESSED_PREFIXES = ['/arrival'];

export function SeasonProvider({
  choices,
  activeId,
  chosen,
  cookieName,
  cookieMaxAge,
  children,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(activeId);

  // The server is the source of truth. If a refresh lands with a different
  // season (another tab, an expired cookie), follow it.
  useEffect(() => {
    setActive(activeId);
  }, [activeId]);

  const suppressed = SUPPRESSED_PREFIXES.some((p) => pathname?.startsWith(p));

  // Let the hero land before interrupting. A prompt that arrives with the
  // first paint reads as an ad; one that arrives after the visitor has seen
  // the place reads as a question.
  useEffect(() => {
    if (chosen || suppressed) return undefined;
    const timer = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(timer);
  }, [chosen, suppressed]);

  const choose = useCallback(
    (id, { explicit = true } = {}) => {
      document.cookie = `${cookieName}=${id}; path=/; max-age=${cookieMaxAge}; samesite=lax`;

      // Repaint immediately. The palette is pure CSS off this attribute, so
      // the theme flips before the server round trip returns with the photos.
      document.documentElement.dataset.season = id;
      setActive(id);
      setOpen(false);

      // Which season visitors are shopping for is the most useful thing this
      // popup produces. umami may be blocked or still loading; never let that
      // break the interaction.
      try {
        window.umami?.track('season-chosen', {
          season: id,
          explicit,
          path: window.location.pathname,
        });
      } catch {
        /* ignore */
      }

      // Server components re-render with the new season's photographs and copy.
      router.refresh();
    },
    [cookieName, cookieMaxAge, router]
  );

  // Dismissing without choosing still writes the cookie, set to whatever the
  // server already decided. Otherwise the popup returns on every page view.
  const dismiss = useCallback(() => {
    choose(active, { explicit: false });
  }, [choose, active]);

  return (
    <SeasonContext.Provider
      value={{ choices, active, open, setOpen, choose, dismiss }}
    >
      {children}
    </SeasonContext.Provider>
  );
}

// Lives in the nav. Lets someone change their mind, and tells them the site is
// currently showing them one season out of four rather than all there is.
export function SeasonTrigger({ className = '' }) {
  const { choices, active, setOpen } = useSeasonPicker();
  const current = choices.find((c) => c.id === active) || choices[0];

  return (
    <button
      type="button"
      className={`season-trigger ${className}`.trim()}
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
    >
      <span
        className="season-trigger__icon"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: current.icon }}
      />
      <span className="season-trigger__label">
        <span className="season-trigger__prefix">Showing</span> {current.label}
      </span>
    </button>
  );
}

export function SeasonDialog() {
  const { choices, active, open, setOpen, choose, dismiss } = useSeasonPicker();
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    dialogRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        dismiss();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      // Only pull focus back if it is still somewhere inside the dialog;
      // choosing a season may have moved it deliberately.
      if (dialogRef.current?.contains(document.activeElement)) {
        previouslyFocused.current?.focus?.();
      }
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div className="season-modal" role="presentation">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="season-modal__backdrop" onClick={dismiss} />
      <div
        className="season-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="season-modal-title"
        aria-describedby="season-modal-desc"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button
          type="button"
          className="season-modal__close"
          onClick={dismiss}
          aria-label="Close and keep the current season"
        >
          &times;
        </button>

        <p className="section-label">Wolfcreek Lodge</p>
        <h2 id="season-modal-title" className="season-modal__title">
          When are you thinking of coming?
        </h2>
        <p id="season-modal-desc" className="season-modal__desc">
          The valley is a different place in each of them. Pick one and we will
          show you that one. You can change it any time from the menu.
        </p>

        <div className="season-modal__grid">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className={`season-option season-option--${choice.id} ${
                choice.id === active ? 'is-active' : ''
              }`}
              onClick={() => choose(choice.id)}
            >
              <span
                className="season-option__icon"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: choice.icon }}
              />
              <span className="season-option__label">{choice.label}</span>
              <span className="season-option__months">{choice.months}</span>
              <span className="season-option__hook">{choice.hook}</span>
            </button>
          ))}
        </div>

        <button type="button" className="season-modal__skip" onClick={dismiss}>
          Not sure yet, just looking
        </button>
      </div>
    </div>
  );
}
