CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cities (
  id      INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  state   VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  lat     DECIMAL(9,6) NOT NULL,
  lng     DECIMAL(9,6) NOT NULL,
  UNIQUE KEY uq_cities_name_country (name, country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE areas (
  id      INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  city_id INT UNSIGNED NOT NULL,
  name    VARCHAR(100) NOT NULL,
  lat     DECIMAL(9,6) NOT NULL,
  lng     DECIMAL(9,6) NOT NULL,
  UNIQUE KEY uq_areas_city_name (city_id, name),
  CONSTRAINT fk_areas_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profiles (
  user_id          INT UNSIGNED NOT NULL PRIMARY KEY,
  bio              TEXT,
  age              TINYINT UNSIGNED,
  gender           VARCHAR(30),
  occupation       VARCHAR(100),
  avatar_url       VARCHAR(500),
  city_id          INT UNSIGNED,
  area_id          INT UNSIGNED NULL,
  search_radius_km INT UNSIGNED NOT NULL DEFAULT 5,
  smoking          ENUM('no','yes','flexible') NOT NULL,
  pets             ENUM('no','yes','flexible') NOT NULL,
  parties          ENUM('no','occasionally','flexible') NOT NULL,
  cleanliness      TINYINT UNSIGNED NOT NULL,
  budget_min       INT UNSIGNED NOT NULL,
  budget_max       INT UNSIGNED NOT NULL,
  move_in_date     DATE NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_profiles_location (city_id, area_id),
  KEY idx_profiles_move_in (move_in_date),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_city FOREIGN KEY (city_id) REFERENCES cities(id),
  CONSTRAINT fk_profiles_area FOREIGN KEY (area_id) REFERENCES areas(id),
  CONSTRAINT chk_cleanliness CHECK (cleanliness BETWEEN 1 AND 5),
  CONSTRAINT chk_budget CHECK (budget_min <= budget_max)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE connections (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  requester_id INT UNSIGNED NOT NULL,
  addressee_id INT UNSIGNED NOT NULL,
  status       ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_connections_pair (requester_id, addressee_id),
  KEY idx_connections_addressee (addressee_id, status),
  CONSTRAINT fk_conn_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conn_addressee FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversations (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_a_id  INT UNSIGNED NOT NULL,
  user_b_id  INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conversations_pair (user_a_id, user_b_id),
  KEY idx_conversations_b (user_b_id),
  CONSTRAINT fk_convo_a FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_convo_b FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_convo_order CHECK (user_a_id < user_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id       INT UNSIGNED NOT NULL,
  body            TEXT NOT NULL,
  read_at         DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_messages_convo_time (conversation_id, created_at),
  CONSTRAINT fk_msg_convo FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
