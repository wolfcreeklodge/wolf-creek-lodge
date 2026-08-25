// STUB FILE - Created 2026-05-26 to unblock build after disk loss.
// Original was uncommitted on Pintea-Ubuntu. See MIGRATION-NOTES.md.

import Image from 'next/image';

export default function PhotoHero({ photo, children }) {
  return (
    <section className="photo-hero">
      {photo && (
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          priority
          sizes="100vw"
          style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
        />
      )}
      <div className="photo-hero__overlay">
        {children}
      </div>
    </section>
  );
}