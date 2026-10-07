'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    setOpen(true);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }

  function closeMenu() {
    setOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <>
      <nav className="landing-nav" aria-label="Primary">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand" aria-label="Operafrika home">
            <Image
              src="/icon.svg"
              alt="Operafrika"
              width={32}
              height={32}
              priority
            />
          </Link>
          <div className="landing-actions">
            <Link href="/app/signup" className="landing-cta">
              Get started
            </Link>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            className="landing-menu-button"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="landing-menu-panel"
            onClick={openMenu}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </nav>
      <div
        id="landing-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`landing-menu-panel${open ? ' landing-menu-panel-open' : ''}`}
        aria-hidden={!open}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="landing-menu-close"
          aria-label="Close menu"
          onClick={closeMenu}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <Link
          href="/app/signup"
          className="landing-cta"
          onClick={closeMenu}
        >
          Get started
        </Link>
      </div>
    </>
  );
}