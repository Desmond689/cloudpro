"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "cloudra_age_verified_v1";
const MIN_AGE = 21; // adjust per the legal minimum in your market

type FieldKey = "month" | "day" | "year";

export default function AgeGate() {
  const [enabled, setEnabled] = useState(false);
  const [verified, setVerified] = useState(true); // default true so nothing flashes before we know
  const [blocked, setBlocked] = useState(false);
  const [dob, setDob] = useState<Record<FieldKey, string>>({ month: "", day: "", year: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const already = window.localStorage.getItem(STORAGE_KEY) === "1";
        const supabase = createClient();
        const { data } = await supabase.from("public_store_settings").select("age_verification_enabled").single();
        if (cancelled) return;
        const isEnabled = data?.age_verification_enabled ?? true;
        setEnabled(isEnabled);
        setVerified(already || !isEnabled);
      } catch {
        // if settings can't be read, fail safe and still gate the site
        setEnabled(true);
        setVerified(window.localStorage.getItem(STORAGE_KEY) === "1");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (enabled && !verified && !blocked) monthRef.current?.focus();
  }, [enabled, verified, blocked]);

  function digitsOnly(v: string) {
    return v.replace(/\D/g, "");
  }

  function handleFieldChange(field: FieldKey, maxLen: number, next: React.RefObject<HTMLInputElement>) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const clean = digitsOnly(e.target.value).slice(0, maxLen);
      setDob((prev) => ({ ...prev, [field]: clean }));
      setFormError(null);
      if (clean.length === maxLen) next.current?.focus();
    };
  }

  function handleKeyDown(field: FieldKey, prev: React.RefObject<HTMLInputElement>) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && dob[field] === "") {
        prev.current?.focus();
      }
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const month = parseInt(dob.month, 10);
    const day = parseInt(dob.day, 10);
    const year = parseInt(dob.year, 10);
    const currentYear = new Date().getFullYear();

    if (!month || month < 1 || month > 12) {
      setFormError("Enter a valid month.");
      monthRef.current?.focus();
      return;
    }
    if (!year || year < currentYear - 110 || year > currentYear) {
      setFormError("Enter a valid year.");
      yearRef.current?.focus();
      return;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (!day || day < 1 || day > daysInMonth) {
      setFormError("Enter a valid day.");
      dayRef.current?.focus();
      return;
    }

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const hasHadBirthdayThisYear =
      today.getMonth() > birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
    if (!hasHadBirthdayThisYear) age -= 1;

    if (age >= MIN_AGE) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      setVerified(true);
    } else {
      setBlocked(true);
    }
  }

  if (!enabled || verified) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-void/95 p-4 backdrop-blur">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center">
        {blocked ? (
          <>
            <p className="font-display text-lg font-semibold">Access restricted</p>
            <p className="mt-2 text-sm text-mute">
              You must be {MIN_AGE}+ to enter this site. Come back when you meet the age requirement.
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="font-display text-lg font-semibold">Age verification</p>
            <p className="mt-2 text-sm text-mute">
              This site sells vape products. Enter your date of birth to continue — you must be {MIN_AGE}+.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <input
                ref={monthRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="MM"
                aria-label="Birth month"
                maxLength={2}
                value={dob.month}
                onChange={handleFieldChange("month", 2, dayRef)}
                className="w-16 rounded-lg border border-line bg-raised py-3 text-center text-xl font-semibold tracking-wider"
              />
              <span className="text-lg text-faint">/</span>
              <input
                ref={dayRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="DD"
                aria-label="Birth day"
                maxLength={2}
                value={dob.day}
                onChange={handleFieldChange("day", 2, yearRef)}
                onKeyDown={handleKeyDown("day", monthRef)}
                className="w-16 rounded-lg border border-line bg-raised py-3 text-center text-xl font-semibold tracking-wider"
              />
              <span className="text-lg text-faint">/</span>
              <input
                ref={yearRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="YYYY"
                aria-label="Birth year"
                maxLength={4}
                value={dob.year}
                onChange={handleFieldChange("year", 4, yearRef)}
                onKeyDown={handleKeyDown("year", dayRef)}
                className="w-20 rounded-lg border border-line bg-raised py-3 text-center text-xl font-semibold tracking-wider"
              />
            </div>

            {formError && <p className="mt-3 text-xs text-bad">{formError}</p>}

            <button type="submit" className="btn-primary mt-5 w-full">
              Confirm & enter
            </button>
            <p className="mt-3 text-xs text-faint">Just type — no scrolling or clicking through years.</p>
          </form>
        )}
      </div>
    </div>
  );
}
