// STUB FILE - Created 2026-05-26 to unblock build after disk loss.
// Original was uncommitted on Pintea-Ubuntu. See MIGRATION-NOTES.md.

import Image from 'next/image';

export default function FullBleedImage({ photo, className = '' }) {
  if (!photo) return null;
  return (
    <div className={`full-bleed ${className}`.trim()}>
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes="100vw"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
}