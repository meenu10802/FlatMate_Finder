-- Distinguish people looking for a place from people with a room to share,
-- and keep the room's photo separate from the person's photo (avatar_url).
-- Two statements on purpose: TiDB (cloud DB) can't reference a column (`AFTER has_room`)
-- added earlier in the same ALTER. The end result is identical on MySQL.
ALTER TABLE profiles
  ADD COLUMN has_room BOOLEAN NOT NULL DEFAULT FALSE AFTER avatar_url;

ALTER TABLE profiles
  ADD COLUMN room_photo_url VARCHAR(500) NULL AFTER has_room;
