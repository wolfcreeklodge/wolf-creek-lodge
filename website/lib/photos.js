// STUB FILE - Auto-generated 2026-05-26 from recovered photo files.
// Original was uncommitted on Pintea-Ubuntu and lost with the disk failure.
// See MIGRATION-NOTES.md. Replace when recovered from the disk.

const photo = (src, alt = '', width = 1920, height = 1080) => ({ src, alt, width, height });

export const heroPhoto = photo('/images/hero/entrance-porch.jpg', 'Wolfridge Retreats');
export const nightPhoto = photo('/images/hero/exterior-daytime.jpg', 'Property at night');
export const entrancePhoto = photo('/images/hero/exterior-night.jpg', 'Entrance');

export const greatRoomPhotos = [
  photo('/images/great-room/fireplace-wall.jpg', 'great room'),
  photo('/images/great-room/living-room-windows.jpg', 'great room'),
  photo('/images/great-room/panoramic-view.jpg', 'great room'),
];

export const diningKitchenPhotos = [
  photo('/images/dining-kitchen/dining-table.jpg', 'dining kitchen'),
  photo('/images/dining-kitchen/kitchen.jpg', 'dining kitchen'),
];

export const bedroomPhotos = [
  photo('/images/bedrooms/bunk-room.jpg', 'bedrooms'),
  photo('/images/bedrooms/guest-winter-view.jpg', 'bedrooms'),
  photo('/images/bedrooms/iron-frame-bed.jpg', 'bedrooms'),
  photo('/images/bedrooms/master-suite.jpg', 'bedrooms'),
];

export const libraryPhotos = [
  photo('/images/library/book-hallway.jpg', 'library'),
  photo('/images/library/writing-nook.jpg', 'library'),
];

export const groundsPhotos = [
  photo('/images/grounds/building-mountain.jpg', 'grounds'),
  photo('/images/grounds/meadow-sprinklers.jpg', 'grounds'),
  photo('/images/grounds/valley-landscape.jpg', 'grounds'),
  photo('/images/grounds/window-dusk-view.jpg', 'grounds'),
];

export const warmingHutPhotos = [
  photo('/images/warming-hut/hot-tub.jpg', 'warming hut'),
  photo('/images/warming-hut/stone-fireplace.jpg', 'warming hut'),
];

// Added 2026-05-26 to satisfy listings/[id]/page.js
export function getListingPhotos(listingId) {
  return [];
}