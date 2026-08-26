-- ==========================================================================
-- 06-spatial-details.sql
-- Room-level dimensions, from the architect's drawings.
--
-- WHY THIS EXISTS
--   Photographs flatten volume. The single most impressive fact about the
--   house -- a 698 sq ft main room whose ceiling rises to 13 ft 6 in -- was
--   not stated anywhere on the site, in the JSON-LD, or in /llms.txt, so
--   neither a guest nor an agent could learn it.
--
--   Source: "09-10_Pinhouse_A3-size" construction set.
--     page 2   floor plans (house)   -- room areas
--     page 3   floor plans (garage)  -- 728.1 sq ft ground, 550 sq ft above
--     page 10  Section 1-1           -- 16'-3" overall, 13'-6" interior at
--                                       the high side, 9' at the low side,
--                                       6 degree shed roof
--
-- ON THE TOTAL AREA
--   The drawings give the house as 2,159 sq ft. properties.property_size_sqft
--   says 2,500 and the owner has kept that figure, on the basis that the
--   house was built somewhat larger than drawn. The exact as-built number is
--   not known, so it is published as approximate and the drawn figure is
--   recorded here so the discrepancy is not silently lost.
--
-- IDEMPOTENT: safe to run more than once.
-- ==========================================================================

BEGIN;

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS spatial JSONB DEFAULT '{}'::jsonb;

UPDATE properties SET spatial = jsonb_build_object(
  'sizeSqFt', 2500,
  'sizeApproximate', true,
  'sizeSource', 'Approximate as-built. The 2009-10 construction drawings show 2,159 sq ft; the house was built somewhat larger.',
  'mainRoomSqFt', 698,
  'ceiling', jsonb_build_object('minFt', 9, 'maxFt', 13.5, 'label', '9 ft, rising to 13 ft 6 in'),
  'structure', 'Shed roof at 6 degrees on glulam beams and 6x6 Douglas fir posts.',
  'rooms', jsonb_build_array(
    jsonb_build_object('name','Kitchen and living room','sqFt',698),
    jsonb_build_object('name','Master bedroom','sqFt',290),
    jsonb_build_object('name','Bedroom 3','sqFt',186),
    jsonb_build_object('name','Bedroom 2','sqFt',173),
    jsonb_build_object('name','Laundry','sqFt',92),
    jsonb_build_object('name','Master bathroom','sqFt',92),
    jsonb_build_object('name','Second bathroom','sqFt',82)
  )
) WHERE id = 'wolf-creek-lodge';

UPDATE properties SET
    property_size_sqft = 550,
    spatial = jsonb_build_object(
      'sizeSqFt', 550,
      'sizeApproximate', false,
      'sizeSource', 'From the construction drawings, garage upper floor.',
      'ceiling', jsonb_build_object('label', 'vaulted throughout, lined in tongue-and-groove pine'),
      'structure', 'Above the 728 sq ft garage, reached by its own stair.'
    )
WHERE id = 'wolf-creek-apartment';

UPDATE properties SET
    property_size_sqft = 3050,
    spatial = jsonb_build_object(
      'sizeSqFt', 3050,
      'sizeApproximate', true,
      'sizeSource', 'The house and the apartment together: approximately 2,500 plus 550 sq ft.',
      'mainRoomSqFt', 698,
      'ceiling', jsonb_build_object('minFt', 9, 'maxFt', 13.5, 'label', '9 ft, rising to 13 ft 6 in in the main room')
    )
WHERE id = 'wolf-creek-retreat-combo';

COMMIT;
