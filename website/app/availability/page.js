import AvailabilityCalendar from '../components/AvailabilityCalendar';

export const metadata = {
  title: 'Availability — Wolfridge Retreats',
  description: 'Check real-time availability for The House, The Apartment, and The Retreat in Winthrop, WA.',
};

export default function AvailabilityPage() {
  return (
    <section className="availability-page">
      <div className="section-inner">
        <div className="availability-header">
          <h1>Availability</h1>
          <p>
            View availability across all three properties. Colored dots indicate booked dates.
            The House and Apartment share physical space with The Retreat, so
            booking one may block the others for those dates.
          </p>
        </div>
        <AvailabilityCalendar />
      </div>
    </section>
  );
}
