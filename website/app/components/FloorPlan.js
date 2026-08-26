// Simplified floor plans, drawn from the 2009-10 "Pinhouse" construction set
// (sheet A-3, page 2 for the house, page 3 for the garage and apartment).
//
// These are deliberately NOT the architect's drawings. Those are a construction
// document -- dense with glulam specs and footing details, and unreadable on a
// phone. What a guest needs is which room is where, how big it is, and which way
// the glass faces. Proportions follow the plan closely enough to be honest but
// are not to scale, and the drawings say so.
//
// Areas are the real figures from the drawings.

const HOUSE_ROOMS = [
  { x: 0,   y: 72,  w: 138, h: 193, name: 'Master bedroom',   sqft: 290 },
  { x: 0,   y: 265, w: 138, h: 80,  name: 'Master bath',      sqft: 92  },
  { x: 138, y: 72,  w: 326, h: 193, name: 'Kitchen + living', sqft: 698, feature: true },
  { x: 138, y: 265, w: 326, h: 80,  name: 'Hall',             sqft: null },
  { x: 464, y: 72,  w: 128, h: 144, name: 'Bedroom 2',        sqft: 173 },
  { x: 592, y: 72,  w: 128, h: 137, name: 'Bedroom 3',        sqft: 186 },
  { x: 464, y: 216, w: 128, h: 129, name: 'Bathroom',         sqft: 82  },
  { x: 592, y: 209, w: 128, h: 136, name: 'Laundry',          sqft: 92  },
];

const HOUSE_PATIOS = [
  { x: 0,   y: 0, w: 138, h: 72, name: 'Covered patio', sqft: 101 },
  { x: 464, y: 0, w: 256, h: 72, name: 'Covered patio', sqft: 185 },
];

const APT_ROOMS = [
  { x: 83,  y: 58, w: 240, h: 202, name: 'Living, dining and sleeping', sqft: 550, feature: true },
  { x: 83,  y: 0,  w: 69,  h: 58,  name: 'Bath',  sqft: 48 },
  { x: 152, y: 0,  w: 93,  h: 58,  name: 'Kitchen', sqft: null },
  { x: 245, y: 0,  w: 78,  h: 58,  name: 'Stair',  sqft: 55 },
];

const APT_DECK = [{ x: 0, y: 0, w: 83, h: 260, name: 'Deck', sqft: null }];

function Room({ r }) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  // Long room names need two lines; short ones sit on one.
  const words = r.name.split(' ');
  const twoLine = r.name.length > 16 && words.length > 2;
  const mid = twoLine ? Math.ceil(words.length / 2) : 0;
  return (
    <g className={r.feature ? 'fp-room fp-room--feature' : 'fp-room'}>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="2" />
      <text x={cx} y={cy} className="fp-name" textAnchor="middle">
        {twoLine ? (
          <>
            <tspan x={cx} dy="-1.1em">{words.slice(0, mid).join(' ')}</tspan>
            <tspan x={cx} dy="1.1em">{words.slice(mid).join(' ')}</tspan>
          </>
        ) : (
          <tspan x={cx} dy="-0.2em">{r.name}</tspan>
        )}
        {r.sqft ? (
          <tspan x={cx} dy="1.5em" className="fp-sqft">{r.sqft} sq ft</tspan>
        ) : null}
      </text>
    </g>
  );
}

function Outdoor({ r }) {
  const cx = r.x + r.w / 2;
  return (
    <g className="fp-outdoor">
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="2" />
      <text x={cx} y={r.y + r.h / 2} className="fp-name" textAnchor="middle">
        <tspan x={cx} dy="-0.2em">{r.name}</tspan>
        {r.sqft ? <tspan x={cx} dy="1.5em" className="fp-sqft">{r.sqft} sq ft</tspan> : null}
      </text>
    </g>
  );
}

export function HouseFloorPlan() {
  return (
    <figure className="floorplan">
      <svg
        viewBox="-14 -34 748 425"
        className="floorplan__svg"
        role="img"
        aria-labelledby="fp-house-title fp-house-desc"
      >
        <title id="fp-house-title">Simplified floor plan of the three bedroom house</title>
        <desc id="fp-house-desc">
          A single storey roughly 72 by 34 feet. The 698 square foot kitchen and living room sits
          in the middle behind a wall of west-facing windows, with the master bedroom and its
          bathroom to one end, bedrooms 2 and 3 to the other, and a hall, second bathroom and
          laundry along the back. Covered patios run along the window side at both ends.
        </desc>

        {HOUSE_PATIOS.map((r, i) => <Outdoor key={`p${i}`} r={r} />)}
        {HOUSE_ROOMS.map((r, i) => <Room key={i} r={r} />)}

        <g className="fp-glass">
          <line x1="138" y1="72" x2="464" y2="72" />
        </g>
        <text x="301" y="-14" className="fp-note" textAnchor="middle">
          West-facing window wall &mdash; ceiling rises to 13&prime;6&Prime;
        </text>
        <text x="360" y="371" className="fp-scale" textAnchor="middle">
          about 72 ft across &middot; simplified, proportions approximate
        </text>
      </svg>
    </figure>
  );
}

export function ApartmentFloorPlan() {
  return (
    <figure className="floorplan">
      <svg
        viewBox="-14 -20 351 310"
        className="floorplan__svg"
        role="img"
        aria-labelledby="fp-apt-title fp-apt-desc"
      >
        <title id="fp-apt-title">Simplified floor plan of the one bedroom apartment</title>
        <desc id="fp-apt-desc">
          A 550 square foot open studio above the garage, roughly 24 by 26 feet, with living,
          dining and sleeping in one vaulted room, a kitchen and bathroom along the entry wall,
          its own stair, and a covered deck running the full length.
        </desc>

        {APT_DECK.map((r, i) => <Outdoor key={`d${i}`} r={r} />)}
        {APT_ROOMS.map((r, i) => <Room key={i} r={r} />)}

        <text x="168" y="286" className="fp-scale" textAnchor="middle">
          about 24 ft by 26 ft &middot; simplified, proportions approximate
        </text>
      </svg>
    </figure>
  );
}
