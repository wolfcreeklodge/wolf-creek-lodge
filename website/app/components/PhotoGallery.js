// STUB FILE - Created 2026-05-26 to unblock build after disk loss.
// Original was uncommitted on Pintea-Ubuntu. See MIGRATION-NOTES.md.

import Image from 'next/image';

// Class names here are a contract with globals.css, not decoration. This stub
// emitted BEM-style .gallery-section__grid / __item / __title, and the
// stylesheet that survived the disk loss styles .gallery-grid / .gallery-item /
// .gallery-section-title. Nothing matched, so the grid never applied: every
// section rendered as a single column of full-width images. At a 1280 viewport
// the four homepage room galleries measured 11,664px tall for eleven
// photographs, and great-room/piano.jpg (2000x3556) rendered 1152x2048.
//
// Renamed to match the stylesheet rather than writing new CSS for the BEM
// names: the stylesheet is the surviving half of the original design, and
// duplicating it would leave .gallery-grid and .gallery-item--lead dead in a
// 3,300-line file for the next reader to untangle. Same call as PhotoStrip
// below.
//
// The inline style the stub passed is gone on purpose. Inline wins over the
// stylesheet, so `height: auto` there would have defeated
// `.gallery-grid img { height: 100% }` and the object-fit cropping with it.
// `lead` promotes the first photograph to the full-width 16/9 slot the
// stylesheet defines. Derived from the count rather than passed per call site,
// because the grid is two columns: an odd number of photographs leaves an
// orphan in the last row, and promoting one to the lead makes the remainder
// even. Checked against all seven current sections -- four homepage, three on
// /area -- and the rule removes every orphan without creating one.
//
// Derived, not hardcoded, because the photo arrays move. widerValleyPhotos went
// from five to six on 2026-09-15 when the alpine lake was added, which flips
// this section's answer; a boolean written at the call site would have been
// silently wrong from that commit on.
//
// Both images the rule actually promotes were checked at 16/9 before adopting
// it: bedrooms/master-bedroom.jpg is portrait 2000x2667 and crops to the
// headboard, quilt and shoji screen intact, and area/community-pool.jpg holds
// up too. Re-check if either section's first photograph changes.
export function GallerySection({ title, photos = [], lead }) {
  const useLead = lead ?? photos.length % 2 === 1;
  return (
    <section className="gallery-section">
      {title && <h2 className="gallery-section-title">{title}</h2>}
      <div className="gallery-grid">
        {photos.map((p, i) => {
          const isLead = useLead && i === 0;
          return (
            <div
              key={p.src}
              className={`gallery-item${isLead ? ' gallery-item--lead' : ''}`}
            >
              <Image
                src={p.src}
                alt={p.alt}
                width={p.width}
                height={p.height}
                sizes={
                  isLead
                    ? '(max-width: 640px) 100vw, 1200px'
                    : '(max-width: 640px) 100vw, 600px'
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
// The .photo-strip-item wrapper is required, not decorative. globals.css styles
// `.photo-strip-item img` (fixed height, auto width, object-fit: cover) and this
// stub was emitting the images as bare children of the flex row, so that rule
// never matched. With inline width:100%/height:auto and the flex default of
// align-items: stretch, every frame was squeezed to a uniform 338x451 box and
// stretched to fill it -- landscape photographs rendered visibly squashed.
// Restored 2026-09-15, when honest portrait dimensions on exterior.jpg made the
// row taller and the distortion impossible to miss.
export function PhotoStrip({ photos = [] }) {
  return (
    <div className="photo-strip">
      {photos.map((p, i) => (
        <div key={i} className="photo-strip-item">
          <Image
            src={p.src}
            alt={p.alt}
            width={p.width}
            height={p.height}
            sizes="(max-width: 768px) 40vw, 25vw"
          />
        </div>
      ))}
    </div>
  );
}