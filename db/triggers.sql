-- These triggers live directly in Postgres (not managed by Drizzle).
-- Run manually against the database when setting up from scratch.

-- ─── Bookmarks search vector ────────────────────────────────────────

CREATE OR REPLACE FUNCTION bookmarks_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.author, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookmarks_search_vector_trigger
  BEFORE INSERT OR UPDATE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION bookmarks_search_vector_update();

-- ─── Memory search vector ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION memory_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memory_search_vector_trigger
  BEFORE INSERT OR UPDATE ON memory
  FOR EACH ROW EXECUTE FUNCTION memory_search_vector_update();
