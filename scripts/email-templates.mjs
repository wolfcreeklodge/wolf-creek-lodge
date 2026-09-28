// ---------------------------------------------------------------------------
// Email templates, one per outbound_emails.kind.
//
// Every template returns { subject, text, html }. The text part is not an
// afterthought: it is what the CRM shows as "what was sent", and a good share
// of guests read mail in clients that prefer it.
//
// Everything a guest typed -- names, messages -- goes through esc() before it
// reaches HTML. A booking request is a public form; its fields are untrusted.
// ASCII only in this file (house rule): typographic characters are written as
// HTML entities in the html part and as plain ASCII in the text part.
// ---------------------------------------------------------------------------

const COLORS = {
  timber: '#2C1810',
  saddle: '#5C3A21',
  rawhide: '#A67B5B',
  parchment: '#F2E8D9',
  snow: '#FAF7F2',
  creekDark: '#345C52',
};

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatStay(p) {
  const nights = `${p.nights} night${p.nights === 1 ? '' : 's'}`;
  return `${formatDate(p.checkIn)} to ${formatDate(p.checkOut)} (${nights})`;
}

function money(n) {
  return `$${Math.round(Number(n)).toLocaleString('en-US')}`;
}

function paragraphsToHtml(text) {
  return String(text)
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p style="margin:0 0 14px">${esc(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// One wrapper for every message. Inline styles only: most mail clients
// strip <style> blocks.
function layout({ bodyHtml, footerHtml }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${COLORS.snow}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.snow}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${COLORS.parchment};border-radius:10px">
<tr><td style="padding:22px 28px 6px;font-family:Georgia,serif;font-size:20px;font-weight:bold;color:${COLORS.timber}">Wolfcreek Lodge</td></tr>
<tr><td style="padding:10px 28px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.saddle}">
${bodyHtml}
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.rawhide}">
${footerHtml}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function detailsTable(rows) {
  const cells = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:${COLORS.rawhide};white-space:nowrap;vertical-align:top">${esc(k)}</td>` +
        `<td style="padding:4px 0;color:${COLORS.timber}">${esc(v).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;font-size:14px">${cells}</table>`;
}

function detailsText(rows) {
  return rows
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${String(v).replace(/\n/g, '\n    ')}`)
    .join('\n');
}

function transactionalFooter(ctx) {
  const html =
    `You are getting this because you sent a request on <a href="${esc(ctx.siteUrl)}" style="color:${COLORS.rawhide}">wolfcreeklodge.us</a>. ` +
    `Reply to this email to reach Bo.<br>Wolfcreek Lodge &middot; ${esc(ctx.postalAddress)}`;
  const text =
    `You are getting this because you sent a request on wolfcreeklodge.us. Reply to this email to reach Bo.\n` +
    `Wolfcreek Lodge - ${ctx.postalAddress}`;
  return { html, text };
}

function stayRows(p) {
  return [
    ['Where', p.propertyTitle],
    ['When', formatStay(p)],
    ['Guests', p.numGuests],
    ['Direct price', p.quotedTotal ? `${money(p.quotedTotal)} (as quoted when you asked)` : null],
    ['Reference', p.reference],
  ];
}

// ---------------------------------------------------------------------------

const templates = {
  request_received(p, ctx) {
    const subject = `We have your request: ${p.propertyTitle}, ${formatDate(p.checkIn)}`;
    const intro =
      `Hi ${p.firstName},\n\nThanks for asking about ${p.propertyTitle}. Those dates were open when you sent the request. ` +
      `Bo will reply personally to confirm and sort out payment.\n\n` +
      `One thing to know: a request does not hold the dates, so until Bo confirms, they could still go. ` +
      `If you have questions, reply to this email.`;
    const rows = stayRows(p);
    const footer = transactionalFooter(ctx);
    return {
      subject,
      text: `${intro}\n\n${detailsText(rows)}\n\nBo\nWolfcreek Lodge\n\n--\n${footer.text}`,
      html: layout({
        bodyHtml: paragraphsToHtml(intro) + detailsTable(rows) + '<p style="margin:0">Bo<br>Wolfcreek Lodge</p>',
        footerHtml: footer.html,
      }),
    };
  },

  request_waitlisted(p, ctx) {
    const subject = `You are on the waitlist: ${p.propertyTitle}, ${formatDate(p.checkIn)}`;
    let intro =
      `Hi ${p.firstName},\n\n${p.propertyTitle} is booked for those dates, so we have put you on the waitlist. ` +
      `Plans change and dates do come free. If yours do, you will hear from us first.`;
    const alts = (p.alternatives || []).map((a) => a.title);
    if (alts.length) {
      intro +=
        `\n\nIn case it helps: ${alts.join(' and ')} ${alts.length === 1 ? 'is' : 'are'} open those dates. ` +
        `Reply to this email if you would like that instead.`;
    }
    const rows = stayRows(p).filter(([k]) => k !== 'Direct price');
    const footer = transactionalFooter(ctx);
    return {
      subject,
      text: `${intro}\n\n${detailsText(rows)}\n\nBo\nWolfcreek Lodge\n\n--\n${footer.text}`,
      html: layout({
        bodyHtml: paragraphsToHtml(intro) + detailsTable(rows) + '<p style="margin:0">Bo<br>Wolfcreek Lodge</p>',
        footerHtml: footer.html,
      }),
    };
  },

  // To Bo. Plain and scannable: this replaces the inquiry email that used to
  // arrive through the mailto link, so it has to carry everything that did.
  owner_new_request(p, ctx) {
    const label = p.status === 'waitlisted' ? 'WAITLIST' : 'NEW REQUEST';
    const subject = `[${label}] ${p.propertyTitle}, ${formatDate(p.checkIn)} - ${p.firstName} ${p.lastName}`;
    const intro =
      p.status === 'waitlisted'
        ? `${p.firstName} ${p.lastName} asked for dates that are already booked, and is on the waitlist.`
        : `${p.firstName} ${p.lastName} asked for dates that were open. Confirm or decline in the CRM.`;
    const rows = [
      ['Where', p.propertyTitle],
      ['When', formatStay(p)],
      ['Guests', p.numGuests],
      ['Quoted', p.quotedTotal ? money(p.quotedTotal) : null],
      ['Email', p.email],
      ['Phone', p.phone],
      ['Message', p.message],
      ['Offers', p.marketingOptIn ? 'Opted in' : 'Not opted in'],
      ['Reference', p.reference],
    ];
    const link = `${ctx.crmUrl}/requests`;
    return {
      subject,
      text: `${intro}\n\n${detailsText(rows)}\n\nOpen the CRM: ${link}`,
      html: layout({
        bodyHtml:
          paragraphsToHtml(intro) +
          detailsTable(rows) +
          `<p style="margin:0"><a href="${esc(link)}" style="color:${COLORS.creekDark};font-weight:bold">Open the request in the CRM</a></p>`,
        footerHtml: 'Sent by the booking request form on wolfcreeklodge.us.',
      }),
    };
  },

  dates_available(p, ctx) {
    const subject = `Good news: ${p.propertyTitle} is open for ${formatDate(p.checkIn)}`;
    const intro =
      `Hi ${p.firstName},\n\nYou asked to hear if ${p.propertyTitle} came free for your dates. It has. ` +
      `Reply to this email and Bo will hold them for you.\n\n` +
      `We are letting you know first, but they are not held until you reply, so do not wait too long.`;
    const rows = stayRows(p).filter(([k]) => k !== 'Direct price');
    const footer = transactionalFooter(ctx);
    return {
      subject,
      text: `${intro}\n\n${detailsText(rows)}\n\nBo\nWolfcreek Lodge\n\n--\n${footer.text}`,
      html: layout({
        bodyHtml: paragraphsToHtml(intro) + detailsTable(rows) + '<p style="margin:0">Bo<br>Wolfcreek Lodge</p>',
        footerHtml: footer.html,
      }),
    };
  },

  // The only marketing template. The unsubscribe link and the postal address
  // are added here, not by whoever writes the promotion, so no promotion can
  // go out without them (CAN-SPAM requires both).
  promotion(p, ctx) {
    const footerText =
      `You are getting this because you asked to hear about offers from Wolfcreek Lodge.\n` +
      `Unsubscribe: ${ctx.unsubscribeUrl}\n` +
      `Wolfcreek Lodge - ${ctx.postalAddress}`;
    const footerHtml =
      `You are getting this because you asked to hear about offers from Wolfcreek Lodge. ` +
      `<a href="${esc(ctx.unsubscribeUrl)}" style="color:${COLORS.rawhide}">Unsubscribe</a> with one click.<br>` +
      `Wolfcreek Lodge &middot; ${esc(ctx.postalAddress)}`;
    const greeting = p.firstName ? `Hi ${p.firstName},\n\n` : '';
    return {
      subject: p.subject,
      text: `${greeting}${p.body}\n\n--\n${footerText}`,
      html: layout({ bodyHtml: paragraphsToHtml(`${greeting}${p.body}`), footerHtml }),
    };
  },
};

export function render(kind, payload, ctx) {
  const fn = templates[kind];
  if (!fn) throw new Error(`No template for kind "${kind}"`);
  return fn(payload, ctx);
}
