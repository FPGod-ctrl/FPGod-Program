// Client-facing plan template preferences, stored in localStorage so they
// persist without a backend settings table. Passed to the Word export endpoint.

export const THEMES = [
  { id: 'modern', name: 'Modern', blurb: 'Clean sans-serif, airy, colour-accented section headers.' },
  { id: 'classic', name: 'Classic', blurb: 'Serif headings, traditional and authoritative.' },
  { id: 'minimal', name: 'Minimal', blurb: 'Understated, lots of white space, thin rules.' },
];

export const ACCENT_PRESETS = ['#0ea5a4', '#2563eb', '#7c3aed', '#0b2545', '#b45309', '#15803d'];

export const defaultTemplate = {
  theme: 'modern',
  accent: '#0ea5a4',
  firmName: 'Your Firm',
  tagline: 'Financial Advisory',
};

const KEY = 'fpgod.planTemplate';

export function loadTemplate() {
  try {
    return { ...defaultTemplate, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...defaultTemplate };
  }
}

export function saveTemplate(t) {
  localStorage.setItem(KEY, JSON.stringify(t));
}
