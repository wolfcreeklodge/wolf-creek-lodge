-- Email sync schema for Microsoft Graph API integration
-- Run manually on existing databases; auto-runs on fresh init

BEGIN;

-- Single-row table for Graph API credentials and sync state
CREATE TABLE IF NOT EXISTS email_sync_state (
    id                  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    access_token        TEXT,
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    delta_link          TEXT,
    last_sync_at        TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ DEFAULT now()
);

INSERT INTO email_sync_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Email metadata linked to guests and reservations
CREATE TABLE IF NOT EXISTS emails (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id        TEXT UNIQUE NOT NULL,
    subject         TEXT,
    from_address    TEXT NOT NULL,
    from_name       TEXT,
    to_addresses    JSONB DEFAULT '[]',
    received_at     TIMESTAMPTZ NOT NULL,
    snippet         TEXT,
    has_attachments BOOLEAN DEFAULT FALSE,
    is_read         BOOLEAN DEFAULT TRUE,
    direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    outlook_url     TEXT,
    guest_id        UUID REFERENCES guests(id),
    reservation_id  UUID REFERENCES reservations(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_graph_id ON emails(graph_id);
CREATE INDEX IF NOT EXISTS idx_emails_guest ON emails(guest_id);
CREATE INDEX IF NOT EXISTS idx_emails_reservation ON emails(reservation_id);
CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_address);

COMMIT;
