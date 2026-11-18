-- Idempotent: safe to re-run.
INSERT IGNORE INTO cities (name, state, country, lat, lng) VALUES
  ('Chennai',   'Tamil Nadu',  'India', 13.082700, 80.270700),
  ('Bengaluru', 'Karnataka',   'India', 12.971600, 77.594600),
  ('Mumbai',    'Maharashtra', 'India', 19.076000, 72.877700),
  ('Pune',      'Maharashtra', 'India', 18.520400, 73.856700);

INSERT IGNORE INTO areas (city_id, name, lat, lng)
SELECT c.id, a.name, a.lat, a.lng FROM cities c JOIN (
  SELECT 'Chennai' AS city, 'Adyar' AS name, 13.001200 AS lat, 80.256500 AS lng UNION ALL
  SELECT 'Chennai',   'T. Nagar',           13.041800, 80.234100 UNION ALL
  SELECT 'Chennai',   'Velachery',          12.981500, 80.218000 UNION ALL
  SELECT 'Chennai',   'Anna Nagar',         13.085000, 80.210100 UNION ALL
  SELECT 'Chennai',   'Mylapore',           13.036800, 80.267600 UNION ALL
  SELECT 'Chennai',   'Thoraipakkam (OMR)', 12.941600, 80.236200 UNION ALL
  SELECT 'Bengaluru', 'Koramangala',        12.935200, 77.624500 UNION ALL
  SELECT 'Bengaluru', 'Indiranagar',        12.978400, 77.640800 UNION ALL
  SELECT 'Bengaluru', 'HSR Layout',         12.911600, 77.647400 UNION ALL
  SELECT 'Bengaluru', 'Whitefield',         12.969800, 77.750000 UNION ALL
  SELECT 'Bengaluru', 'Jayanagar',          12.925000, 77.593800 UNION ALL
  SELECT 'Bengaluru', 'Electronic City',    12.845200, 77.660200 UNION ALL
  SELECT 'Mumbai',    'Andheri West',       19.136400, 72.829600 UNION ALL
  SELECT 'Mumbai',    'Bandra West',        19.059600, 72.829500 UNION ALL
  SELECT 'Mumbai',    'Powai',              19.117600, 72.906000 UNION ALL
  SELECT 'Mumbai',    'Lower Parel',        18.998600, 72.830700 UNION ALL
  SELECT 'Mumbai',    'Malad West',         19.187400, 72.848400 UNION ALL
  SELECT 'Pune',      'Kothrud',            18.507400, 73.807700 UNION ALL
  SELECT 'Pune',      'Hinjewadi',          18.591300, 73.738900 UNION ALL
  SELECT 'Pune',      'Viman Nagar',        18.567900, 73.914300 UNION ALL
  SELECT 'Pune',      'Baner',              18.559000, 73.786800
) a ON a.city = c.name AND c.country = 'India';
