import { getListingIds } from '../lib/data.js';

const SITE = 'https://wolfcreeklodge.us';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  let ids = [];
  try {
    ids = await getListingIds();
  } catch {
    ids = [];
  }
  const now = new Date();

  const staticPages = [
    { url: `${SITE}/`, priority: 1.0, changeFrequency: 'weekly' },
    { url: `${SITE}/winter`, priority: 0.9, changeFrequency: 'weekly' },
    { url: `${SITE}/availability`, priority: 0.9, changeFrequency: 'daily' },
    { url: `${SITE}/area`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${SITE}/about`, priority: 0.5, changeFrequency: 'yearly' },
    { url: `${SITE}/contact`, priority: 0.6, changeFrequency: 'yearly' },
  ];

  return [
    ...staticPages.map((p) => ({ ...p, lastModified: now })),
    ...ids.map((id) => ({
      url: `${SITE}/listings/${id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })),
  ];
}
