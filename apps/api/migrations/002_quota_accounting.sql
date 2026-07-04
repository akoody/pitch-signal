ALTER TABLE provider_requests
  ADD COLUMN IF NOT EXISTS counts_toward_quota boolean NOT NULL DEFAULT true;

-- Versions before 0.1.1 treated paid-only `last` plan errors as consumed quota.
-- API-Football returns those errors with HTTP 200 but does not count them.
UPDATE provider_requests
SET counts_toward_quota = false
WHERE request_key LIKE '%last=%';
