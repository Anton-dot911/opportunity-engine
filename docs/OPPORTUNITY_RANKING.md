# Opportunity Ranking v1

## Purpose

Provide a deterministic, advisory ordering of opportunities using their latest operator-assessed score snapshot. Ranking is not an approval decision and never changes opportunity lifecycle status.

## Rules

- Use only the latest score snapshot for each opportunity.
- Opportunities with a numeric score and coverage at or above the requested threshold are ranked first.
- Opportunities below the coverage threshold, with an insufficient-data rating, or without a score remain visible after rankable items.
- Within each group, order by weighted score descending, coverage descending, then opportunity update time descending.
- Missing scores are not treated as zero.
- The default minimum coverage is 60%; the default limit is 100, capped at 200.
- Ranking is computed at read time; no ranking snapshot or additional migration is required.

## API

`GET /api/opportunities/ranking?status=draft&limit=100&minimumCoverage=60`

Returns ordered `items`, applied `criteria`, and an explicit advisory-only note.
