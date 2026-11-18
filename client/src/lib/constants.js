// Mirrors the ENUMs in server/db/migrations/001_init.sql — keep in sync.
export const SMOKING = ['no', 'yes', 'flexible'];
export const PETS = ['no', 'yes', 'flexible'];
export const PARTIES = ['no', 'occasionally', 'flexible'];
export const CLEANLINESS_LABELS = {
  1: 'Relaxed',
  2: 'Easygoing',
  3: 'Tidy',
  4: 'Very tidy',
  5: 'Spotless',
};

export const PREFERENCE_LABELS = {
  no: 'No',
  yes: 'Yes',
  flexible: 'Flexible',
  occasionally: 'Occasionally',
};
