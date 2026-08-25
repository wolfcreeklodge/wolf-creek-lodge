// STUB FILE - Created 2026-05-26 to unblock build after disk loss.
// Original was uncommitted on Pintea-Ubuntu. See MIGRATION-NOTES.md.

import Image from 'next/image';

export function GallerySection({ title, photos = [] }) {
  return (
    <section className="gallery-section">
      {title && <h2 className="gallery-section__title">{title}</h2>}
      <div className="gallery-section__grid">
        {photos.map((p, i) => (
          <div key={i} className="gallery-section__item">
            <Image
              src={p.src}
              alt={p.alt}
              width={p.width}
              height={p.height}
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
export function PhotoStrip({ photos = [] }) {
  return (
    <div className="photo-strip">
      {photos.map((p, i) => (
        <Image
          key={i}
          src={p.src}
          alt={p.alt}
          width={p.width}
          height={p.height}
          sizes="(max-width: 768px) 100vw, 33vw"
          style={{ width: '100%', height: 'auto' }}
        />
      ))}
    </div>
  );
}