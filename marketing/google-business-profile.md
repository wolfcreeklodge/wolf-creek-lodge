# Google Business Profile - listing content

Prepared 2026-08-26. Everything below is ready to paste. **Creating and verifying
the profile has to be done by the owner** - it needs a Google account sign-in and
identity verification, which is not something an agent should do on your behalf.

Start at <https://business.google.com/create>.

---

## No existing pin - you create, you do not claim

Checked 2026-08-26: Google has **no pin at 17 Lucky Louie Rd**. That means the
straightforward "Add your business" flow rather than the slower claim-and-dispute
route over someone else's listing. Do not create a second listing later if one
appears in the meantime; duplicates are the reliable way to get suspended.

## Two things to decide before you start

**1. Eligibility - largely settled, in your favour.** Google Maps was checked
directly on 2026-08-26 and **individual cabins at this location already have their
own map pins**: "Sleeping Wolf Cabin" and "Chickadee cabin" are separate places
alongside the resort itself. So Google already accepts individually listed vacation
units here. That is a much better position than the general guidance suggests, and
it substantially de-risks the concern that a self-managed rental gets suspended.

Two related observations from the same view:

- **Wolfridge Resort is claimed and is a hotel-class listing.** 4.5 stars from 51
  reviews, labelled "3-star hotel", carrying Google's "Check availability" and
  "Compare prices" booking integration. That is a different and heavier listing type
  than a vacation rental, run by the resort, and not something to imitate.
- **"Wolf Ridge Resort" appears as a second, separate pin** from "Wolfridge Resort".
  Whether that is a genuine duplicate on Google's side is worth a look, if only as a
  live example of what fragmented listings do to a business.

Follow the cabins' precedent, not the resort's: an individual vacation-rental place
at your own address, under your own brand.

**2. Verification.** Google usually verifies by postcard to the business address.
Resolved: the owner is in Winthrop roughly one week in every month, so a postcard
is collectable - it just gates the timeline on the next trip. Video verification is
faster where offered and worth trying first.

**3. Wolf Ridge Resort already exists as a business, at a different address.**
The resort trades from `14 Lucky Louie Road` (phone 509.996.2828, sixty acres,
log townhome cabins, its own booking site at wolfridge-resort.com). This property
is `17 Lucky Louie Rd` - a privately owned home inside the same development, not
part of the resort's rental programme. Different street number, so a profile here
is **not** a duplicate of theirs and should not trip Google's duplicate detection.

Two things follow. Keep the two identities clearly separate: do not describe the
listing as "at Wolf Ridge Resort" in the business name or description in a way that
reads as though it is the resort, because that invites both a Google merge and an
annoyed neighbour. And expect Google to associate them by proximity regardless, so
the photographs and description need to make obvious which building is which.

Worth checking directly before you create anything, because it takes two minutes and
changes the plan if wrong: open Google Maps, search "Wolf Ridge Resort Winthrop",
and look at the listing. If it shows **"Claim this business"** it is unclaimed. If
it shows owner-managed content - replies to reviews, posts, booking links - someone
is actively running it. Either way, note whether Google has already attached any
pin to 17 Lucky Louie Rd, which would need claiming rather than creating.

Note the directories already disagree about the resort's own address: Yelp lists it
at 412 Wolf Creek Rd. Inconsistent NAP is exactly the problem to avoid for this
listing.

---

## Step by step

Confirmed 2026-08-26 from Google Maps: `17 Lucky Louie Rd` resolves as an address
only, with "Add your business" offered in the panel. Plus Code `GP2J+89 Winthrop`.

**1. Decide which Google account owns this, before you click anything.**
The account you use becomes the profile owner. Moving ownership later is possible
but tedious. Use an account you will still control in five years and that is not
shared. You can add managers afterwards without giving up ownership.

**2. Start the flow.** Either click **Add your business** from the Maps panel, or
go to <https://business.google.com/create>. Both land in the same place.

**3. Business name:** `Wolfcreek Lodge`
Exactly that. Do not append "Winthrop Cabin Rental" or similar. Keyword stuffing the
name is a guideline violation and one of the most common causes of suspension.

**4. Category:** `Lodge` - confirmed available and accepted 2026-08-26.
Not "Hotel". Google gates that on operations - a front desk, on-site management,
direct guest contact - not on how good the building is. Rates and availability there
also require a Hotel Center connection through a booking engine or channel manager,
which this property does not have, so a Hotel listing would either show an empty
"Check availability" panel or fill it from partner feeds and route traffic to Vrbo.
`Lodge` matches the name, sits in lodging, and keeps the Website button as the
primary call to action, which is the whole point of the profile. Add
`Vacation home rental` and `Cabin rental` as secondaries.

**5. "Do you want to add a location customers can visit?"** &rarr; **Yes**.
Then enter `17 Lucky Louie Rd, Winthrop, WA 98862`.

**6. Drag the pin onto the actual building.** This is the step people skip. Google
geocodes the address to a guess, and in the Maps view the marker sits out in open
ground rather than on the house. Switch to satellite and drop it on the roof. A wrong
pin means guests are directed to a field, and it is much harder to correct later.

**7. Service area:** skip it. Guests come to you; you do not travel to them. Setting
a service area on a lodging listing muddles what Google thinks you are.

**8. Contact details.**
- Phone: `+1 206-681-0117`
- Website: the tagged URL from Core fields below, so Maps traffic is measurable.

**9. Verification.** Choose **video** if it is offered - it is immediate and avoids
the postcard entirely. If only postcard is available, request it timed to a Winthrop
week. Nothing you enter goes live until this completes.

**10. Only after verification**, fill in hours, description, attributes and photos
from the sections below. Adding them before verification sometimes loses them.

**11. Then close the loop on the site.** Add the resulting Google Maps place URL to
the footer and `/contact`, and check Umami for arrivals under campaign `gbp`.

---

## Core fields

| Field | Value |
|---|---|
| Business name | `Wolfcreek Lodge` |
| Primary category | `Lodge` -- accepted by Google 2026-08-26 |
| Secondary categories | `Vacation home rental`, `Cabin rental`, `Holiday home` |
| Business type | **Local store only.** Not Online retail (there is no checkout, booking is an email enquiry) and not Service business (guests come here; a service area muddles what Google thinks this is) |
| Address | `17 Lucky Louie Rd, Winthrop, WA 98862` |
| Phone | `+1 206-681-0117` |
| Website | `https://wolfcreeklodge.us/?utm_source=google&utm_medium=organic&utm_campaign=gbp` |
| Appointment link | `https://wolfcreeklodge.us/contact?utm_source=google&utm_medium=organic&utm_campaign=gbp-appointment` |

### Why the URLs carry tags

Linking the site from Maps is the main thing this profile is for. Tagging the link
is what turns it from a link into a measurement: every visit arriving through the
Maps listing lands in Umami under campaign `gbp`, so "did the profile generate
traffic" becomes a number rather than an impression.

Verified 2026-08-26 end to end: the tagged URL returns 200 with no redirect and no
parameter stripping, and Umami recorded the campaign and `google.com` as referrer.

Google displays the domain, not the query string, so the listing still reads
`wolfcreeklodge.us`. Use the same three parameters, changing only `utm_campaign`,
for every other directory listed in this file. That is what makes them comparable.

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
