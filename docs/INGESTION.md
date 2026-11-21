# Ingestion and Document Processing

## RSS / Atom collection

The operator registers a source and manually triggers collection with:

`POST /api/sources/:id/ingest`

The current ingestion service:
1. Fetches and parses an RSS 2.0 or Atom feed.
2. Normalizes item title, URL, text, publication time, and feed metadata.
3. Creates an ingestion-run record.
4. Persists feed entries as documents.
5. Deduplicates by source + canonical URL and source + content hash.
6. Finishes the run with counts or a bounded error summary.

Current feed limits:
- HTTP and HTTPS only.
- DNS addresses are checked against private/reserved ranges before requests.
- Maximum 3 redirects.
- 8-second fetch timeout.
- 1 MB response limit, enforced while streaming.
- Maximum 50 entries per feed.
- Feed entries are treated as untrusted data.

## Article fetch and extraction connectors

The connector package also provides article fetching and Readability-based extraction. These are primitives and are not yet wired into the RSS ingestion service.

Article-fetch limits:
- HTTP and HTTPS only; credentials in URLs are rejected.
- Redirects are validated and bounded (4 redirects).
- 8-second timeout.
- Maximum 1 MB HTML response.
- HTML/XHTML content types only.

Extraction:
- Readability is used to identify the main article body.
- Text is normalized and capped at 100,000 characters.
- Title, canonical URL, byline, excerpt, site name, publication time, language, content hash, extractor version, and extraction method are returned when available.
- Raw HTML is not persisted by this extractor.

## Security limitations

DNS validation currently happens before the HTTP request, but the HTTP client resolves the hostname again. This leaves a DNS-rebinding/TOCTOU SSRF gap. IPv6 special-address classification also requires a dedicated audit. These connectors should not be exposed as public fetch services until address pinning and network-level egress controls are implemented.

The ingestion API has no authentication or rate limiting. CORS is not an access-control mechanism; deployment must remain local/private until authentication and outbound network controls are added.
