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
  photo('/images/great-room/piano.jpg',
    'An antique carved upright piano in the great room, below a station clock, beside a window onto the meadow',
    2000, 3556),
];

export const diningKitchenPhotos = [
  photo('/images/dining-kitchen/dining-table.jpg', 'Dining table'),
  photo('/images/dining-kitchen/kitchen.jpg', 'Kitchen'),
];

// Replaced 2026-08-26 with the April 2026 shoot. The previous four were
// recovered from the truncated migration tarball and were the weakest interiors
// on the site. The old files remain on disk, unreferenced.
export const bedroomPhotos = [
  photo('/images/bedrooms/master-bedroom.jpg',
    'The master bedroom: a live-edge timber headboard and sage quilt, with clerestory windows above and a shoji screen onto the valley',
    2000, 2667),
  photo('/images/bedrooms/guest-bedroom.jpg',
    'The guest bedroom: a black iron bedstead against a warm terracotta wall, with a window onto the meadow and the ridge beyond',
    2000, 2667),
  photo('/images/bedrooms/bunk-room-loft.jpg',
    'The bunk room: a suspended timber loft bunk reached by a custom ladder, with a reading corner beneath',
    2000, 2667),
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

// bedroom-nook.jpg and workspace.jpg were dropped 2026-08-26: both were dark,
// near-identical close-ups of a monitor on a desk and were the weakest images on
// the listing. The files remain on disk, just unreferenced. Replacements come
// from 'Winthrop House/Apartment Photos for website'.
// The valley, and Creek, the resident German shorthaired pointer. These are what
// guests actually do here: the river, the bluffs above it, and the peaks at the
// head of the valley. Added 2026-08-26; /area had carried no photographs at all.
// Split deliberately. The first group is reachable on foot from the property.
// The second is the wider valley and needs a drive -- the dry sagebrush country
// in those frames is the lower valley, not the forested reach behind the house.
// Do not merge them: the whole point of the page is which is which.
export const backDoorPhotos = [
  photo('/images/area/river-from-the-path.jpg',
    'The river running clear between cottonwoods and pines, seen from the bank path, with snow still on the peaks upvalley',
    2000, 1500),
  photo('/images/area/river-gravel-bar.jpg',
    'Creek, a German shorthaired pointer, standing on the cobbled gravel bar at the edge of the water',
    2000, 3556),
  photo('/images/area/trail-through-woods.jpg',
    'A singletrack trail winding through open woods with the last of the snow lying in the hollows',
    2000, 1500),
  photo('/images/area/creek-on-point.jpg',
    'Creek locked on point among the timber, one foot raised, in the woods behind the property',
    2000, 2667),
];

export const widerValleyPhotos = [
  photo('/images/area/creek-river-bluff.jpg',
    'Creek standing on a bluff high above a bend in the water, the valley opening out to dry hills beyond',
    2000, 1125),
  photo('/images/area/creek-overlook.jpg',
    'Creek sitting at the edge of the bluff, looking out over the water to the hills and distant snow',
    2000, 2667),
  photo('/images/area/methow-peaks.jpg',
    'Snow-covered peaks at the head of the valley, seen through standing timber from a ridge trail',
    2000, 2667),
  photo('/images/area/valley-panorama.jpg',
    'The whole valley from a high shoulder: forest, meadow and river running away to the mountains',
    2000, 1500),
  photo('/images/area/valley-from-ridge.jpg',
    'The forested valley floor and the river far below, framed by pines from high on a ridge',
    2000, 2667),
];

// The building seen from the meadow. Added 2026-08-26: the site had plenty of
// interiors but almost nothing showing the house and the garage/apartment block
// together, or the west-facing window wall that the great room is built around.
export const exteriorPhotos = [
  photo(
    '/images/exterior/house-garage-from-field.jpg',
    'The house seen from the meadow: the long single-storey wing with its west-facing window wall on the right, and the two-storey garage and apartment block on the left, backed by ponderosa pines',
    2560, 1920
  ),
  photo(
    '/images/exterior/west-window-wall.jpg',
    'The west elevation close up: a wall of tall windows under a deep cedar-framed overhang, with the covered patio and dining table alongside',
    2560, 1920
  ),
];

export const apartmentPhotos = [
  photo('/images/apartment/living-dining.jpg', 'The apartment living and dining area, with the whitewashed shiplap partition and vaulted pine ceiling', 2000, 1500),
  photo('/images/apartment/living-room.jpg', 'Apartment living room, with bookshelves and windows onto the valley'),
  photo('/images/apartment/kitchen.jpg', 'Apartment kitchen, with patterned tile backsplash and full-size appliances'),
  photo('/images/apartment/bedroom.jpg', 'Apartment bedroom, with a queen bed against the terracotta accent wall'),
  photo('/images/apartment/bathroom.jpg', 'Apartment bathroom, with a walk-in shower and a window onto the trees', 2000, 1500),
  photo('/images/apartment/entry.jpg', 'The apartment entry, under the cedar-slat wall of the covered walkway', 2000, 1500),
  photo('/images/apartment/deck-panoramic.jpg', 'Panoramic view from the apartment deck'),
  photo('/images/apartment/deck-winter.jpg', 'The apartment deck in winter, looking out over snow to the ridge'),
  photo('/images/apartment/exterior.jpg', 'Apartment exterior'),
];

// Replaced 2026-08-25: the previous file was not the apartment. Source is
// IMG_6496.jpg from 'Winthrop House/Apartment Photos for website'; the camera
// original sits beside it as hero-living-area-original.jpg.
export const apartmentHero = photo(
  '/images/apartment/hero-living-area.jpg',
  'The apartment living area: a round dining table and upholstered chairs beside a whitewashed shiplap partition, with a black futon, bookshelves and a window seat beyond',
  2560,
  1920
);
const comboHero = photo('/images/hero/exterior-daytime.jpg', 'Both units at Wolfridge Retreats');

const LISTING_PHOTOS = {
  'wolf-creek-lodge': {
    hero: exteriorPhotos[0],
    gallery: [
      ...exteriorPhotos,
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
      ...exteriorPhotos,
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
