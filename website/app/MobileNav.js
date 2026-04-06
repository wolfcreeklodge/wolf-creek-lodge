'use client';

import { useState, useCallback } from 'react';

export function MobileNav({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <button
        className={`nav-toggle ${isOpen ? 'active' : ''}`}
        onClick={toggle}
        aria-label="Toggle navigation menu"
      >
        <span />
        <span />
        <span />
      </button>
      <div
        className={`nav-overlay ${isOpen ? 'open' : ''}`}
        onClick={close}
      />
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={`nav-links ${isOpen ? 'open' : ''}`} onClick={close}>
        {children}
      </div>
    </>
  );
}
