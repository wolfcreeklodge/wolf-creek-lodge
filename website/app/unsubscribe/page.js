export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Unsubscribe - Wolfcreek Lodge',
  robots: { index: false, follow: false },
};

// Confirm-then-post, not unsubscribe-on-open. See api/unsubscribe/route.js:
// mail scanners open every link in a message, so opening this page must not
// change anything by itself.
export default async function UnsubscribePage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.t === 'string' ? params.t : '';
  const done = params?.done === '1';

  return (
    <section className="page-hero">
      {done ? (
        <>
          <h1>You are unsubscribed</h1>
          <p>
            No more offers from us. If you have a stay booked or a request open, you will still
            get the emails about that.
          </p>
        </>
      ) : token ? (
        <>
          <h1>Stop our offers?</h1>
          <p>
            One click and we will stop sending you promotions. Emails about a booking or a request
            you have made are not affected.
          </p>
          <form method="POST" action={`/api/unsubscribe?t=${encodeURIComponent(token)}`}>
            <input type="hidden" name="from" value="page" />
            <button type="submit" className="btn btn--primary btn--large">
              Unsubscribe
            </button>
          </form>
        </>
      ) : (
        <>
          <h1>Unsubscribe</h1>
          <p>
            This link is missing its code. Use the unsubscribe link at the bottom of any offer we
            sent you, or email us and we will take you off the list.
          </p>
        </>
      )}
    </section>
  );
}
