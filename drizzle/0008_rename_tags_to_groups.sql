-- Rename tags → groups
ALTER TABLE "tags" RENAME TO "groups";

-- Rename bookmark_tags → bookmark_groups
ALTER TABLE "bookmark_tags" RENAME TO "bookmark_groups";

-- Rename tag_id column → group_id
ALTER TABLE "bookmark_groups" RENAME COLUMN "tag_id" TO "group_id";
