// STUB FILE - Auto-generated 2026-05-26 from recovered photo files.
// Original was uncommitted on Pintea-Ubuntu and lost with the disk failure.
// See MIGRATION-NOTES.md. Replace when recovered from the disk.
//
// 2026-08-25: getListingPhotos was returning a bare [], but listings/[id]/page.js
// reads photos.hero and photos.gallery.length, so every listing page threw
// "Cannot read properties of undefined (reading 'length')" and returned 500.
// It now returns the { hero, gallery } shape the page expects.

const photo = (src, alt = '', width = 1920, height = 1080) => ({ src, alt, width, height });

export const heroPhoto = photo('/images/hero/entrance-porch.jpg', 'Wolfridge Retreats');
export const nightPhoto = photo('/images/hero/exterior-daytime.jpg', 'Property at night');
export const entrancePhoto = photo('/images/hero/exterior-night.jpg', 'Entrance');

export const greatRoomPhotos = [
  photo('/images/great-room/fireplace-wall.jpg', 'Great room fireplace wall'),
  photo('/images/great-room/living-room-windows.jpg', 'Living room windows'),
  photo('/images/great-room/panoramic-view.jpg', 'Panoramic valley view from the great room'),
];

export const diningKitchenPhotos = [
  photo('/images/dining-kitchen/dining-table.jpg', 'Dining table'),
  photo('/images/dining-kitchen/kitchen.jpg', 'Kitchen'),
];

export const bedroomPhotos = [
  photo('/images/bedrooms/bunk-room.jpg', 'Bunk room'),
  photo('/images/bedrooms/guest-winter-view.jpg', 'Guest bedroom with winter view'),
  photo('/images/bedrooms/iron-frame-bed.jpg', 'Bedroom with iron frame bed'),
  photo('/images/bedrooms/master-suite.jpg', 'Master suite'),
];

export const libraryPhotos = [
  photo('/images/library/book-hallway.jpg', 'Book-lined hallway'),
  photo('/images/library/writing-nook.jpg', 'Writing nook'),
];

export const groundsPhotos = [
  photo('/images/grounds/building-mountain.jpg', 'The house against the mountain'),
  photo('/images/grounds/meadow-sprinklers.jpg', 'Meadow in summer'),
  photo('/images/grounds/valley-landscape.jpg', 'Methow Valley landscape'),
  photo('/images/grounds/window-dusk-view.jpg', 'View from the window at dusk'),
];

export const warmingHutPhotos = [
  photo('/images/warming-hut/hot-tub.jpg', 'Hot tub at the warming hut'),
  photo('/images/warming-hut/stone-fireplace.jpg', 'Stone fireplace in the warming hut'),
];

export const apartmentPhotos = [
  photo('/images/apartment/living-room.jpg', 'Apartment living room'),
  photo('/images/apartment/kitchen.jpg', 'Apartment kitchen'),
  photo('/images/apartment/bedroom.jpg', 'Apartment bedroom'),
  photo('/images/apartment/bedroom-nook.jpg', 'Apartment bedroom nook'),
  photo('/images/apartment/workspace.jpg', 'Apartment workspace'),
  photo('/images/apartment/deck-panoramic.jpg', 'Panoramic view from the apartment deck'),
  photo('/images/apartment/deck-winter.jpg', 'Apartment deck in winter'),
  photo('/images/apartment/exterior.jpg', 'Apartment exterior'),
];

// Replaced 2026-08-25: the previous file was not the apartment. Source is
// IMG_6496.jpg from 'Winthrop House/Apartment Photos for website'; the camera
// original sits beside it as hero-living-area-original.jpg.
const apartmentHero = photo(
  '/images/apartment/hero-living-area.jpg',
  'The apartment living area: a round dining table and upholstered chairs beside a whitewashed shiplap partition, with a black futon, bookshelves and a window seat beyond',
  2560,
  1920
);
const comboHero = photo('/images/hero/exterior-daytime.jpg', 'Both units at Wolfridge Retreats');

const LISTING_PHOTOS = {
  'wolf-creek-lodge': {
    hero: heroPhoto,
    gallery: [
      ...greatRoomPhotos,
      ...diningKitchenPhotos,
      ...bedroomPhotos,
      ...libraryPhotos,
      ...warmingHutPhotos,
      ...groundsPhotos,
    ],
  },
  'wolf-creek-apartment': {
    hero: apartmentHero,
    gallery: apartmentPhotos,
  },
  'wolf-creek-retreat-combo': {
    hero: comboHero,
    gallery: [
      ...greatRoomPhotos,
      ...bedroomPhotos,
      ...apartmentPhotos.slice(0, 4),
      ...warmingHutPhotos,
      ...groundsPhotos,
    ],
  },
};

// Always returns { hero, gallery }. Unknown ids fall back to the house hero and
// an empty gallery rather than undefined, so a bad id renders instead of throwing.
export function getListingPhotos(listingId) {
  const entry = LISTING_PHOTOS[listingId];
  if (!entry) return { hero: heroPhoto, gallery: [] };
  return entry;
}

// ---------------------------------------------------------------------------
// Orientation imagery, added 2026-08-25.
//
// PROPERTY_AERIAL is public: it shows the house against the river and the
// community pool/hot tub, which is the question every prospective guest asks
// and no room photo answers.
//
// ARRIVAL_MAP is NOT public. It is the annotated final-approach route and is
// only rendered on /arrival/{token}, behind a per-reservation token. Do not
// reference it from any indexed page.
//
// Both files here are web derivatives, resized 2026-08-25 from originals that
// were 17.4 MB and 11.7 MB. The camera/screenshot originals sit beside them as
// *-original.* and are never served. Regenerate derivatives from those, not
// from these, so quality does not compound.
// ---------------------------------------------------------------------------
export const PROPERTY_AERIAL = photo(
  '/images/aerial/property-overview.jpg',
  'Aerial view over the Methow Valley in spring: the Methow River winding through cottonwood and pine, open meadow beyond it, and the snow-capped North Cascades on the horizon. The house is the red-roofed building in the meadow right of centre.',
  2560,
  1705
);

export const ARRIVAL_MAP = photo(
  '/images/arrival/directions-map.webp',
  'Satellite map of the final approach: the route in red along Wolf Creek Road and Lucky Louie Road to the house, with turns to avoid marked X',
  2048,
  1450
);
