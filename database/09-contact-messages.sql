-- ==========================================================================
-- 09-contact-messages.sql
--
-- The /contact form never sent anything. ContactForm.js was a placeholder
-- that showed "Thank you for your message!" and discarded the message, so
-- every enquiry made through it was lost, with no record. Found 2026-10-11
-- when the owner tested it.
--
-- Messages now go through the same outbox as every other email: the website
-- queues a 'contact_message' row addressed to site_config.contact_email, and
-- scripts/send-email.mjs delivers it with Reply-To set to the sender, so the
-- owner answers with a plain reply. The row is the record: a message the
-- provider cannot take stays queued and visible on the CRM's Outbox page
-- instead of vanishing.
--
-- Additive and idempotent. Apply with:
--   docker exec -i wcl-database psql -U wolfcreek -d wolfcreek < database\09-contact-messages.sql
-- ==========================================================================

BEGIN;

ALTER TABLE outbound_emails DROP CONSTRAINT IF EXISTS outbound_emails_kind_check;
ALTER TABLE outbound_emails ADD CONSTRAINT outbound_emails_kind_check
    CHECK (kind IN ('request_received', 'request_waitlisted', 'owner_new_request',
                    'dates_available', 'promotion', 'contact_message'));

-- The contact endpoint rate-limits by a hash of the sender's address, kept in
-- the payload. This keeps that count cheap.
CREATE INDEX IF NOT EXISTS idx_outbound_emails_contact_ip
    ON outbound_emails ((payload->>'ipHash'), created_at)
 WHERE kind = 'contact_message';

COMMIT;
