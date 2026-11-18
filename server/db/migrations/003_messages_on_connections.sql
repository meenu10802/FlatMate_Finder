-- Messages belong to an accepted connection (one connection = one chat thread).
-- Replaces the unused `conversations` table and the old conversation-based `messages` table (both were empty).
-- "Only when accepted" can't be a FK rule, so services/messageService.js enforces it on every read and write.
-- Timestamps are stored in UTC (the app pool sets time_zone = '+00:00').

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;

CREATE TABLE messages (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  connection_id INT UNSIGNED NOT NULL,
  sender_id     INT UNSIGNED NOT NULL,
  body          TEXT NOT NULL,
  read_at       DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_messages_thread (connection_id, id),
  KEY idx_messages_unread (connection_id, read_at, sender_id),
  CONSTRAINT fk_messages_connection FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
