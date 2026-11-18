// Mirrors the ENUMs in server/db/migrations/001_init.sql and server/src/validators/profileSchemas.js — keep in sync.

export const SMOKING_OPTIONS = [
  { value: 'no', label: 'Smoke-free', desc: 'No smoking in the home' },
  { value: 'yes', label: 'Smoker', desc: 'I smoke, or it’s fine at home' },
  { value: 'flexible', label: 'Either way', desc: 'Doesn’t bother me' },
];

export const PETS_OPTIONS = [
  { value: 'no', label: 'No pets', desc: 'Prefer a pet-free home' },
  { value: 'yes', label: 'Pet friendly', desc: 'I have or want pets' },
  { value: 'flexible', label: 'Either way', desc: 'Happy with or without' },
];

export const PARTIES_OPTIONS = [
  { value: 'no', label: 'Quiet home', desc: 'Calm evenings, few guests' },
  { value: 'occasionally', label: 'Now & then', desc: 'A gathering once in a while' },
  { value: 'flexible', label: 'Either way', desc: 'Fine with whatever' },
];

export const CLEANLINESS_LABELS = {
  1: 'Relaxed',
  2: 'Easygoing',
  3: 'Tidy',
  4: 'Very tidy',
  5: 'Spotless',
};

export const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

export const LIFESTYLE_FIELDS = [
  { key: 'smoking', title: 'Smoking', options: SMOKING_OPTIONS },
  { key: 'pets', title: 'Pets', options: PETS_OPTIONS },
  { key: 'parties', title: 'House parties', options: PARTIES_OPTIONS },
];

export const optionFor = (options, value) => options.find((o) => o.value === value);

export const RADIUS = { min: 1, max: 25, default: 5 };
