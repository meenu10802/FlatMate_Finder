import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

/**
 * Sample flatmates so Browse/matching have data in development. Idempotent: re-running resets their profiles.
 * Every sample account gets a random password nobody knows, so they cannot be logged into.
 */

// [name, emailSlug, city, area|null, age, occupation, gender, smoking, pets, parties, cleanliness, budgetMin, budgetMax, moveInOffsetDays, hasRoom, radius, bio]
const PEOPLE = [
  ['Ananya Rao', 'ananya', 'Chennai', 'Adyar', 26, 'Product designer', 'Woman', 'no', 'flexible', 'occasionally', 4, 15000, 24000, 14, true, 5,
    'Early riser, filter-coffee loyalist, and I cook a big South Indian lunch most Sundays. Looking for someone tidy who likes a calm home on weeknights.'],
  ['Karthik Iyer', 'karthik', 'Chennai', 'Velachery', 28, 'Backend engineer', 'Man', 'no', 'no', 'no', 5, 12000, 20000, 30, false, 8,
    'Work from home three days a week, so a quiet flat matters. Weekend cricket, weekday early nights.'],
  ['Meera Krishnan', 'meera', 'Chennai', 'Mylapore', 24, 'Architecture student', 'Woman', 'no', 'yes', 'flexible', 3, 10000, 16000, 7, false, 6,
    'I have a very well-behaved cat called Biscuit. Love plants, late-night sketching and the occasional board-game evening.'],
  ['Rahul Menon', 'rahul', 'Bengaluru', 'Koramangala', 29, 'Data scientist', 'Man', 'flexible', 'flexible', 'occasionally', 3, 20000, 32000, 21, true, 5,
    'Spare room in a 2BHK with a balcony. Into running, bad puns and good biryani.'],
  ['Sneha Kulkarni', 'sneha', 'Bengaluru', 'Indiranagar', 27, 'Marketing manager', 'Woman', 'no', 'no', 'occasionally', 4, 18000, 28000, 45, false, 4,
    'Gym in the morning, podcasts in the evening. Happy to share cooking and grocery runs.'],
  ['Arjun Shetty', 'arjun', 'Bengaluru', 'HSR Layout', 31, 'Startup founder', 'Man', 'yes', 'no', 'flexible', 2, 15000, 25000, 10, false, 10,
    'Long hours at work, so I mostly need a place to crash. Easygoing about most things.'],
  ['Priya Nair', 'priya', 'Mumbai', 'Powai', 25, 'Consultant', 'Woman', 'no', 'flexible', 'no', 5, 25000, 38000, 20, true, 6,
    'Travel for work two weeks a month. Looking for someone respectful and neat to share a sunny flat by the lake.'],
  ['Kabir Shah', 'kabir', 'Mumbai', 'Bandra West', 30, 'Music producer', 'Man', 'flexible', 'yes', 'flexible', 3, 30000, 45000, 60, false, 5,
    'Home studio is soundproofed, I promise. Dog dad to a golden retriever named Tofu.'],
  ['Ishita Deshpande', 'ishita', 'Pune', 'Baner', 23, 'Software engineer', 'Woman', 'no', 'no', 'occasionally', 4, 9000, 15000, 5, false, 7,
    'First job, first flat away from home! Love baking and weekend treks to Sinhagad.'],
];


const isoInDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

async function upsertPerson(conn, person, email) {
  const [name, , cityName, areaName, age, occupation, gender, smoking, pets, parties, cleanliness, budgetMin, budgetMax, offset, hasRoom, radius, bio] = person;
  const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  await conn.query(
    'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)',
    [email, name, hash]
  );
  const [[user]] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
  const [[loc]] = await conn.query(
    'SELECT c.id AS city_id, a.id AS area_id FROM cities c LEFT JOIN areas a ON a.city_id = c.id AND a.name = ? WHERE c.name = ?',
    [areaName, cityName]
  );
  if (!loc) throw new Error(`Seed city "${cityName}" missing — run the cities seed first`);

  await conn.query('DELETE FROM profiles WHERE user_id = ?', [user.id]);
  await conn.query(
    `INSERT INTO profiles (user_id, bio, age, gender, occupation, has_room, city_id, area_id, search_radius_km,
       smoking, pets, parties, cleanliness, budget_min, budget_max, move_in_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user.id, bio, age, gender, occupation, hasRoom, loc.city_id, loc.area_id, radius,
      smoking, pets, parties, cleanliness, budgetMin, budgetMax, isoInDays(offset)]
  );
}

export async function seedSampleUsers(conn) {
  for (const p of PEOPLE) await upsertPerson(conn, p, `${p[1]}@sample.flatmatefinder.dev`);
  return PEOPLE.length;
}
