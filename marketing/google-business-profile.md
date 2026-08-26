# Google Business Profile - listing content

Prepared 2026-08-26. Everything below is ready to paste. **Creating and verifying
the profile has to be done by the owner** - it needs a Google account sign-in and
identity verification, which is not something an agent should do on your behalf.

Start at <https://business.google.com/create>.

---

## Two things to decide before you start

**1. Eligibility.** Google's guidelines require a business to be able to receive
customers at the listed address. A staffed hotel clearly qualifies; a self-managed
vacation rental is a greyer case, and profiles that look like unstaffed short-term
lets do sometimes get suspended. The defensible position here is that this is a
lodging business at a real address where guests physically stay, listed under a
vacation-rental category. Worth knowing the risk exists before investing in it,
because a suspension is harder to undo than a fresh listing is to create.

**2. Verification will be posted to Winthrop.** Google usually verifies by postcard
to the business address - `17 Lucky Louie Rd` - and you are in Seattle. Either
arrange for someone at Wolfridge to collect it, or request video verification,
which is increasingly the default for lodging and avoids the problem entirely.

---

## Core fields

| Field | Value |
|---|---|
| Business name | `Wolfridge Retreats` |
| Primary category | `Vacation home rental` |
| Secondary categories | `Holiday home`, `Lodging` |
| Address | `17 Lucky Louie Rd, Winthrop, WA 98862` |
| Phone | `+1 206-681-0117` |
| Website | `https://wolfcreeklodge.us` |
| Appointment link | `https://wolfcreeklodge.us/contact` |

Use the brand name exactly. Do not append keywords like "Winthrop Cabin Rental" -
that is a guideline violation and a common cause of suspension.

## Description (738 characters, within the 750 limit)

```
Two mountain homes at Wolfridge Resort in Winthrop, in Washington's Methow Valley.
Book the three-bedroom house, the one-bedroom apartment, or both together as a
four-bedroom retreat sleeping ten.

The Methow Community Trail crosses the property about forty feet from the back
door, so this is ski-in/ski-out in the literal sense: 200-plus kilometres of
groomed trail, the largest cross-country network in North America, groomed
overnight. The river is a short walk through the cottonwoods. In summer the same
trails are for hiking and riding.

The house has a 698 sq ft main room under a ceiling rising to 13 feet 6 inches,
with a wall of west-facing windows onto the meadow.

Book direct by email. No platform, no service fees, taxes included.
```

## Attributes to set

- Free Wi-Fi, free parking on premises
- Kitchen in unit, laundry, hot tub, seasonal outdoor pool
- Pet-friendly (confirm against `house_rules` per SKU before ticking)
- Air conditioning, heating
- Identifies as women-owned / veteran-owned: only if true

## Hours

A vacation rental has no counter hours. Either set 24 hours, or set
"Open by appointment". Do not invent 9-5 hours you will not answer.

## Photos to upload

All already sized and on disk under `website/public/images/`:

| Slot | File |
|---|---|
| Logo / profile | brand mark - **does not exist yet**, see gap below |
| Cover | `aerial/property-overview.jpg` |
| Exterior | `exterior/house-garage-from-field.jpg`, `exterior/west-window-wall.jpg` |
| Interior | `great-room/fireplace-wall.jpg`, `great-room/panoramic-view.jpg`, `great-room/piano.jpg` |
| Rooms | `bedrooms/master-bedroom.jpg`, `bedrooms/guest-bedroom.jpg`, `bedrooms/bunk-room-loft.jpg` |
| Apartment | `apartment/hero-living-area.jpg`, `apartment/kitchen.jpg`, `apartment/deck-winter.jpg` |
| Surroundings | `area/river-from-the-path.jpg`, `area/trail-through-woods.jpg`, `area/methow-peaks.jpg` |

Ten to fifteen is plenty. Google favours profiles that add photos periodically over
ones dumped once, so hold some back.

## Gaps to close

- **No logo or brand mark exists.** Google wants a square profile image. Currently
  there is nothing but photographs.
- **Reviews do not transfer.** The 4.9 across 46 Airbnb and Vrbo reviews cannot be
  imported. The profile starts at zero, and Google reviews are a separate asset that
  has to be built from direct guests. This is a real argument for the email booking
  flow: those guests can be asked.

## After it is live

- Add the Google Maps place URL to the site footer and `/contact`.
- Cross-check NAP (name, address, phone) against every other listing. Inconsistent
  NAP across directories is the most common local-SEO own goal.
- Watch referral traffic in Umami at <http://127.0.0.1:8083>.
