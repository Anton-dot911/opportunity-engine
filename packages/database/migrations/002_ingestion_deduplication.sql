CREATE UNIQUE INDEX IF NOT EXISTS documents_source_hash_unique
  ON documents(source_id, content_hash)
  WHERE source_id IS NOT NULL AND content_hash IS NOT NULL;
