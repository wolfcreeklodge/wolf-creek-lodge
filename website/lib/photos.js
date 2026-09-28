// STUB FILE - Auto-generated 2026-05-26 from recovered photo files.
// Original was uncommitted on Pintea-Ubuntu and lost with the disk failure.
// See MIGRATION-NOTES.md. Replace when recovered from the disk.
//
// 2026-08-25: getListingPhotos was returning a bare [], but listings/[id]/page.js
// reads photos.hero and photos.gallery.length, so every listing page threw
// "Cannot read properties of undefined (reading 'length')" and returned 500.
// It now returns the { hero, gallery } shape the page expects.

const photo = (src, alt = '', width = 1920, height = 1080) => ({ src, alt, width, height });

export const heroPhoto = photo('/images/hero/entrance-porch.jpg', 'Wolfcreek Lodge');
export const nightPhoto = photo('/images/hero/exterior-daytime.jpg', 'Property at night');
export const entrancePhoto = photo('/images/hero/exterior-night.jpg', 'Entrance');

// Replaced 2026-09-27 with the owner's 2026-09-26 shoot: camera originals at
// 5712x4284, where the three frames they replace were 1920x1280 and dark, shot
// into winter light. They were also declared 1920x1080 via the default, which
// was wrong. Old files remain on disk, unreferenced, per the 2026-08-26
// precedent.
//
// ORDER MATTERS: greatRoomPhotos[0] is also the Featured Retreat card on the
// homepage (page.js), so the strongest frame of the room goes first.
//
// The replaced frames were the only interiors showing snow through the
// windows. If a winter-specific great room is ever wanted, fireplace-wall.jpg,
// living-room-windows.jpg and panoramic-view.jpg are still on disk.
export const greatRoomPhotos = [
  photo('/images/great-room/window-wall-meadow.jpg',
    'The great room in afternoon sun: two dark leather sofas and a pair of armchairs facing a wall of tall timber-framed windows onto the green meadow and the forested hillside beyond, with a carved antique piano and a skeleton wall clock to one side',
    2560, 1920),
  photo('/images/great-room/fireplace-feature-wall.jpg',
    'The fireplace wall: horizontal cedar slats rising to the pine ceiling around a long linear fireplace under a floating timber mantel, with a swivel armchair and leather sofas on a patterned rug',
    2560, 1920),
  photo('/images/great-room/open-plan-dining-kitchen.jpg',
    'The open plan from the living area: a live-edge dining table under a beam pendant light by the meadow windows, running into the kitchen with maple cabinets, dark counters and a farmhouse sink',
    2560, 1920),
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
  // Alt corrected 2026-09-15. The stub called this "The house against the
  // mountain"; the frame is actually deep winter, which matters because the
  // seasonal photo sets pick by alt text and this one was about to be served
  // as autumn. If you reuse it, it is a winter photograph.
  photo('/images/grounds/building-mountain.jpg',
    'The meadow under deep snow in winter, seen past the corner of the house, with bare cottonwoods along the treeline and the forested ridge white behind'),
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

// Shared Wolfridge amenities. The site named the pool and the hot tub in text but
// pictured neither, which for a seasonal outdoor pool in a valley that has very few
// is a strange thing to leave to the imagination.
export const communityPhotos = [
  photo('/images/area/community-pool.jpg',
    'The community outdoor pool, fenced and set among cedars, looking out to the resort lawn',
    2000, 1500),
  photo('/images/area/community-pool-lawn.jpg',
    'The pool from the far side, with loungers, a shaded table and open lawn beyond the fence',
    2000, 1500),
  photo('/images/area/community-hot-tub.jpg',
    'The shared hot tub under its log-framed shelter, set into a stone surround and open year round',
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
  // Added 2026-09-15. The site claimed "hiking and wildlife viewing in the
  // North Cascades" as a summer draw and pictured none of it. Same trip and
  // same caveat as autumnPhotos: high country up Highway 20, not the property,
  // and the lake is not named because nobody has confirmed which one it is.
  photo('/images/area/alpine-lake.jpg',
    'An alpine lake with a small wooded island at the head of a hanging valley, ringed by steep green slopes and scree, with row on row of North Cascades peaks beyond',
    2560, 1920),
  // Added 2026-09-27, from the owner's 2026-09-26 shoot. The summer and fall
  // copy both sell Highway 20 as the scenic way in, and this is the first
  // photograph of the drive. Same naming caveat as the lake: unconfirmed, so
  // "a highway", not a route number or a pass.
  //
  // KNOWN FLAW: a faint rainbow lens flare runs diagonally through the left
  // half of the frame. Kept because nothing else shows the road; replace it
  // the next time someone is up there with the sun behind them.
  //
  // This takes the set from six to seven, which switches on GallerySection's
  // odd-count lead: creek-river-bluff.jpg, already 16:9, becomes the
  // full-width frame.
  photo('/images/area/highway-pass-switchback.jpg',
    'A highway switchbacking far below a high ridge dusted with early snow, dark forest filling the valley floor under a clear sky',
    2560, 1920),
];

// ---------------------------------------------------------------------------
// Autumn. Added 2026-09-15, closing the gap opened by the seasonal looks: until
// now there was not one autumn frame on the site, so `fall` was dressed in
// late-summer material. These are the real thing, shot 2023-09-30 at peak larch.
//
// Source: 'House Photos for Website/2026 Lana'. The two panoramas arrived as
// iOS HEIC tiled at 48 and 64 references, which libheif refuses by default and
// sharp cannot be told to allow; they were decoded out of band. The originals
// are 12 MB and 16000 px wide and stay in OneDrive. Do NOT copy them into
// public/ -- everything under it is served, which is the same mistake that made
// the arrival map fetchable (Known broken 3). Regenerate from OneDrive, not
// from these derivatives, so quality does not compound.
//   larch-basin           <- 20230930_193434559_iOS.heic, whole frame
//   larch-spires-panorama <- 20230930_195410754_iOS.heic, left 8944 px
//   larch-valley          <- 20230930_193442754_iOS.heic, centre 8579 px
// The two crops are deliberate: the slots they fill are 2.37:1 and 21/9, and an
// uncropped 4.4:1 panorama would have been centre-cropped by object-fit into
// something nobody chose.
//
// These are the high country, NOT the property, and the alt text says so on
// purpose: the larch basin is a drive and a walk from the house, up Highway 20.
// Nothing here should imply it is the back garden.
//
// UNCONFIRMED: the spires read like the Liberty Bell group above Washington
// Pass and the lake in area/alpine-lake.jpg like Lake Ann on the Maple Pass
// loop, but nobody has confirmed either, so no place name appears in any alt
// text. Ask the owner before naming them -- a wrong landmark in alt text would
// propagate straight into the answer engines this site is optimised for.
// ---------------------------------------------------------------------------
export const autumnPhotos = [
  photo('/images/autumn/larch-basin.jpg',
    'Larches in full autumn gold filling a high basin in the North Cascades, threaded with dark evergreens, under bare rock ridges holding the first snow of the season',
    2560, 1920),
  photo('/images/autumn/larch-spires-panorama.jpg',
    'A wide view along a ridge of golden larches to a line of jagged rock spires, early snow lying in the gullies and cloud breaking over the range behind',
    2560, 1080),
  photo('/images/autumn/larch-valley.jpg',
    'Golden larches running down a high valley in the North Cascades, seen from a rocky shoulder, with a snow-streaked peak standing over the head of it',
    2560, 1099),
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

// ---------------------------------------------------------------------------
// Apartment. Reworked 2026-09-15 from 'House Photos for Website/2026 Lana'.
//
// Two things were wrong here and both are fixed below.
//
// 1. Every dimension that was not explicitly passed fell back to the 1920x1080
//    default, and six of them were wrong. exterior.jpg was the bad one: it is
//    1600x2133 PORTRAIT and was declared landscape, so next/image reserved a
//    box of the wrong shape for it. All ten now carry measured values.
// 2. kitchen and living-room were the weakest frames in the set and better
//    versions of both rooms existed. Swapped.
//
// New files rather than overwrites, per the 2026-08-26 precedent: the old
// kitchen.jpg and living-room.jpg stay on disk, unreferenced. public/images is
// gitignored, so an overwrite here is unrecoverable if OneDrive does not happen
// to hold that exact frame.
//
// INTERIM: the three new frames came over WhatsApp and are capped at 1600 px
// and ~200 KB by its recompression. That is parity with what they replace, not
// an improvement in quality -- the win is composition. A fingerprint pass
// showed the existing deck-panoramic, deck-winter and hero-living-area are
// byte-identical to frames in this same batch, so the set has always been
// WhatsApp material. Owner is shooting the property properly in the week of
// 2026-09-21; replace these from camera originals when that lands.
// ---------------------------------------------------------------------------
export const apartmentPhotos = [
  photo('/images/apartment/living-dining.jpg', 'The apartment living and dining area, with the whitewashed shiplap partition and vaulted pine ceiling', 2000, 1500),
  // Replaces living-room.jpg, which showed the same room darker and from
  // further back. This one carries the desk, which is a real amenity the
  // listing advertises and had no photograph of since workspace.jpg was
  // dropped on 2026-08-26 for being a close-up of a monitor.
  photo('/images/apartment/living-room-workspace.jpg',
    'The apartment living room: a black futon and ottoman on a woven rug, bookshelves and a cushioned window seat along one wall, and a desk with a large monitor under three windows looking out over the snow to the ridge',
    1600, 1200),
  // Replaces kitchen.jpg, which was shot at an angle with the corner of a
  // table intruding. This is the full galley run, straight on.
  photo('/images/apartment/kitchen-galley.jpg',
    'The apartment kitchen: a single galley run under gloss white cabinets, with a green and white patterned tile backsplash, dishwasher, sink, induction cooktop, microwave and full-size fridge, below a terracotta wall and a pine ceiling',
    1600, 1200),
  photo('/images/apartment/bedroom.jpg', 'Apartment bedroom, with a queen bed against the terracotta accent wall', 1600, 1200),
  photo('/images/apartment/bathroom.jpg', 'Apartment bathroom, with a walk-in shower and a window onto the trees', 2000, 1500),
  photo('/images/apartment/entry.jpg', 'The apartment entry, under the cedar-slat wall of the covered walkway', 2000, 1500),
  // Added deliberately. The apartment sits over the garage and is reached by a
  // full flight of stairs; a guest who needs to know that should not have to
  // infer it from the exterior shot.
  photo('/images/apartment/stairs.jpg',
    'The staircase down from the apartment to its own entrance, a straight flight between grey walls to a terracotta entry hall with a coat rack at the bottom',
    1200, 1600),
  // Both deck frames are winter; there is no summer one. Phrase this alt so it
  // does not contain the literal 'deck in winter' -- seasons.js finds the
  // winter hero by that substring and would otherwise match this one first.
  photo('/images/apartment/deck-panoramic.jpg',
    'The view from the apartment deck out over the snow-covered meadow to the treeline and the ridge beyond',
    1600, 1200),
  photo('/images/apartment/deck-winter.jpg', 'The apartment deck in winter, looking out over snow to the ridge', 1600, 1200),
  photo('/images/apartment/exterior.jpg',
    'The apartment from outside: the upper floor of the two-storey garage block, with its own covered deck above and the garage doors beneath',
    1600, 2133),
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
const comboHero = photo('/images/hero/exterior-daytime.jpg', 'Both units at Wolfcreek Lodge');

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
