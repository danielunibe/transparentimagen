import { EventCluster } from '@/types/asteria';

interface EventsPanelProps {
    events: EventCluster[];
}

export function EventsPanel({ events }: EventsPanelProps) {
    return (
        <section className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.04] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#7f826f] font-bold">Events</div>
            <h3 className="text-[#f2f2ef] text-[16px] font-semibold mt-1">Events base prepared</h3>
            <p className="text-[#9ca099] text-[12px] mt-1">Future date grouping and manual event clusters can reuse this structure. Current stored events: {events.length}.</p>
        </section>
    );
}
