// ---------------------------------------------------------------------------
// Seasonal look.
//
// One module decides what a season IS: which months it covers, which accent
// colours it repaints the site with, which photographs lead, and what the
// homepage says. Pages read from here. Nothing else should hardcode a season.
//
// The visitor picks a season in the popup (SeasonPicker) and the choice is
// stored in the `wcl_season` cookie. The root layout reads that cookie, puts
// the id on <html data-season>, and CSS does the repaint. No cookie means we
// fall back to seasonForDate(), which is what a crawler and a first-time
// visitor both see, so the default is always the season the valley is
// actually in rather than an arbitrary one.
//
// Boundaries are the Methow's, not the almanac's. Winter ends when the
// grooming does, not on the equinox.
//
// PHOTOGRAPHY (2026-09-15): fall shipped first with no autumn frames at all --
// every image on disk was winter, spring or summer -- and was dressed in
// late-summer material as a stopgap. Real larch photography arrived the same
// day and now carries the hero, the mood band and the gallery lead. The two
// remaining fall frames are year-round property shots, marked below; they are
// not pretending to be October, they are the house and the meadow.
// ---------------------------------------------------------------------------

import {
  PROPERTY_AERIAL,
  apartmentPhotos,
  autumnPhotos,
  backDoorPhotos,
  communityPhotos,
  exteriorPhotos,
  greatRoomPhotos,
  groundsPhotos,
  heroPhoto,
  warmingHutPhotos,
  widerValleyPhotos,
} from './photos.js';

export const SEASON_COOKIE = 'wcl_season';

// Six months. Long enough that a guest planning next winter in March is not
// asked twice, short enough that a returning guest is asked again next year.
export const SEASON_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export const SEASON_IDS = ['winter', 'spring', 'summer', 'fall'];

// [id, startMonth, startDay], inclusive, in calendar order. Winter wraps the
// year end, so it is both the first and the last entry by elimination.
const SEASON_STARTS = [
  ['spring', 3, 16],
  ['summer', 6, 1],
  ['fall', 9, 15],
  ['winter', 12, 1],
];

// photos.js exports flat arrays, not a keyed manifest. Look frames up by a
// distinctive fragment of their alt text rather than by index, so reordering
// an array over there cannot silently swap a season's hero over here.
const byAlt = (list, fragment) =>
  list.find((p) => p.alt.toLowerCase().includes(fragment.toLowerCase()));

const apartmentDeckWinter = byAlt(apartmentPhotos, 'deck in winter');
const riverFromPath = byAlt(backDoorPhotos, 'bank path');
const riverGravelBar = byAlt(backDoorPhotos, 'gravel bar');
const trailThroughWoods = byAlt(backDoorPhotos, 'singletrack');
const pool = byAlt(communityPhotos, 'community outdoor pool');
const poolLawn = byAlt(communityPhotos, 'pool from the far side');
const hotTub = byAlt(communityPhotos, 'shared hot tub');
const valleyPanorama = byAlt(widerValleyPhotos, 'whole valley');
const creekBluff = byAlt(widerValleyPhotos, 'bluff high above');
const methowPeaks = byAlt(widerValleyPhotos, 'snow-covered peaks');
const westWindowWall = byAlt(exteriorPhotos, 'west elevation');
const houseFromField = byAlt(exteriorPhotos, 'seen from the meadow');
const alpineLake = byAlt(widerValleyPhotos, 'alpine lake');
const larchBasin = byAlt(autumnPhotos, 'high basin');
const larchSpires = byAlt(autumnPhotos, 'rock spires');
const larchValley = byAlt(autumnPhotos, 'high valley');

// groundsPhotos[0] is deliberately not bound: it is a deep-winter frame that
// the stub alt text described as a generic exterior. See photos.js.
const meadowSprinklers = groundsPhotos[1];
const valleyLandscape = groundsPhotos[2];
const windowDusk = groundsPhotos[3];

export const SEASONS = {
  winter: {
    id: 'winter',
    label: 'Winter',
    // HTML entities, not literal glyphs: this file is ASCII by house rule.
    icon: '&#10052;',
    months: 'December to mid-March',
    // One line, shown in the picker. Say the thing that is true here and
    // nowhere else, not the thing every mountain rental says.
    hook: 'Ski from the back door onto 200+ km of groomed trail.',
    tagline: 'Ski-in, ski-out on the largest nordic network in North America.',
    kicker: 'Winter in the Methow Valley',
    hero: apartmentDeckWinter || heroPhoto,
    mood: hotTub || warmingHutPhotos[0],
    gallery: [apartmentDeckWinter, methowPeaks, warmingHutPhotos[1]].filter(Boolean),
    band: {
      label: 'Winter 2026/27',
      title: 'The trail is groomed overnight. Your skis start at the door.',
      body:
        'The Methow Community Trail crosses the property forty feet from the back door. '
        + 'Wolf Ridge is a named trailhead on it, and it is the spine of a 200+ km network, '
        + 'the largest in North America. Trail pass prices, the 2026/27 event calendar, and '
        + 'the one thing Seattle guests get wrong about the winter drive.',
      ctaHref: '/winter',
      ctaLabel: 'Plan a winter stay',
    },
    activities: [
      'Methow Community Trail crosses the property, 40 ft from the back door',
      '200+ km of trails, the largest nordic network in North America',
      'Loup Loup Ski Bowl for downhill, about 30 minutes away',
      'Snowshoe and fat bike routes on the same network',
      'Year-round hot tub for the end of the day',
    ],
    // SR 20 is shut from roughly December to mid-April. The drive is the
    // most common winter surprise, so it gets its own line.
    note: 'Highway 20 is closed all winter. From Seattle you come around the south end.',
  },

  spring: {
    id: 'spring',
    label: 'Spring',
    icon: '&#127807;',
    months: 'mid-March to May',
    hook: 'Green-up, high water, and the valley to yourself.',
    tagline: 'Snowmelt in the river, green in the meadow, nobody on the trail.',
    kicker: 'Spring in the Methow Valley',
    hero: PROPERTY_AERIAL,
    mood: riverFromPath || valleyPanorama,
    gallery: [valleyPanorama, creekBluff, trailThroughWoods].filter(Boolean),
    band: {
      label: 'Shoulder season',
      title: 'The quietest weeks of the year, at the lowest rates of the year.',
      body:
        'The snow comes off the valley floor first, and the trails behind the house dry out '
        + 'weeks before the high country does. The river runs hard with snowmelt. Highway 20 '
        + 'over Rainy and Washington passes stays closed until somewhere between mid-April '
        + 'and early May, so an early-spring stay still comes in around the south end.',
      ctaHref: '/area',
      ctaLabel: 'What is out the back door',
    },
    activities: [
      'Low-elevation singletrack dries out first, right behind the property',
      'The Methow runs high and loud with snowmelt, a short walk away',
      'Birding along the river before the summer traffic arrives',
      'Highway 20 reopens between mid-April and early May',
      'Year-round hot tub for the cold evenings',
    ],
    note: 'The gap between the ski season and Memorial Day is the emptiest the valley gets.',
  },

  summer: {
    id: 'summer',
    label: 'Summer',
    icon: '&#9728;',
    months: 'June to mid-September',
    hook: 'The ski network becomes a mountain bike network.',
    tagline: 'The same 200+ km of trail, without the snow. Plus a pool.',
    kicker: 'Summer in the Methow Valley',
    hero: westWindowWall || heroPhoto,
    mood: pool || meadowSprinklers,
    // Meadow, high country, river. The pool is already the mood frame, so the
    // second slot goes to the alpine lake instead of poolLawn: the summer list
    // has claimed North Cascades hiking since before there was a photo of it.
    gallery: [meadowSprinklers, alpineLake || poolLawn, riverGravelBar].filter(Boolean),
    band: {
      label: 'Summer in the valley',
      title: 'Ride from the door, swim in the afternoon, sit out until it is dark.',
      body:
        'The winter trail network is a mountain bike network from June. The heated community '
        + 'pool is open Memorial Day to Labor Day and the hot tub is open all year. The North '
        + 'Cascades Highway is open, which makes the drive from Seattle both the short way in '
        + 'and one of the best roads in the state.',
      ctaHref: '/area',
      ctaLabel: 'What is out the back door',
    },
    activities: [
      'The same trails become a mountain bike network',
      'Hiking and wildlife viewing in the North Cascades',
      'Methow River access, a short walk away',
      'Heated community pool, Memorial Day to Labor Day',
      'Covered patio and outdoor dining on the west side',
    ],
    note: 'Highway 20 is open. Over Rainy and Washington passes is the scenic way in.',
  },

  fall: {
    id: 'fall',
    label: 'Fall',
    icon: '&#127810;',
    months: 'mid-September to November',
    hook: 'Larches turning gold, trails empty, nights cold enough for the fire.',
    tagline: 'Gold on the hillsides, frost on the meadow, nobody else on the trail.',
    kicker: 'Autumn in the Methow Valley',
    // Real larch, shot 2023-09-30 at peak. These are the high country up
    // Highway 20, not the property; the band copy and the alt text both say so.
    hero: larchBasin || valleyLandscape || heroPhoto,
    mood: larchSpires || windowDusk,
    // Lead is larch. The two secondary frames show the house and its meadow on
    // dry tan grass under a bare treeline -- not shot in October, but nothing
    // in them contradicts it either. Deliberately NOT groundsPhotos[0]: that
    // one is lying in snow.
    gallery: [larchValley, houseFromField, valleyLandscape].filter(Boolean),
    band: {
      label: 'Larch season',
      title: 'The larches turn gold from late September, and the valley empties out.',
      body:
        'Larch is the conifer that gives up. For two or three weeks from late September into '
        + 'October the hillsides above the valley turn gold before the needles drop, and the '
        + 'high country up Highway 20 goes with them. The summer traffic is gone, the trails '
        + 'behind the house are dry and cool, and the pass stays open until the first serious '
        + 'snow closes it around December.',
      ctaHref: '/area',
      ctaLabel: 'What is out the back door',
    },
    activities: [
      'Larch gold on the hillsides from late September into October',
      'The trail network is dry, cool and almost empty',
      'Highway 20 stays open until the first heavy snow, usually December',
      'Cold nights for the wood fire and the year-round hot tub',
      'The last of the river season before the water drops',
    ],
    note: 'The shoulder between the bike season and the ski season, and the quietest weeks in the valley.',
  },
};

// Everything the picker needs and nothing it does not. Passed from the server
// layout as props so the client bundle never pulls in the photo manifest.
export function seasonChoices() {
  return SEASON_IDS.map((id) => {
    const s = SEASONS[id];
    return { id: s.id, label: s.label, icon: s.icon, months: s.months, hook: s.hook };
  });
}

// Which season the valley is actually in. Takes a Date so it is testable, and
// so a caller can ask about a future stay rather than about today.
export function seasonForDate(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let current = 'winter';
  for (const [id, m, d] of SEASON_STARTS) {
    if (month > m || (month === m && day >= d)) current = id;
  }
  return current;
}

// Cookies are visitor-supplied. Never let one reach a CSS selector or a photo
// lookup unchecked.
export function normalizeSeason(value) {
  return SEASON_IDS.includes(value) ? value : null;
}

export function getSeason(id) {
  return SEASONS[normalizeSeason(id) || seasonForDate()];
}
