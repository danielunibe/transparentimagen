import { PersonCluster } from '@/types/asteria';

interface PeoplePanelProps {
    people: PersonCluster[];
}

export function PeoplePanel({ people }: PeoplePanelProps) {
    return (
        <section className="rounded-2xl bg-[#101212] ring-1 ring-white/[0.04] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)] flex flex-col gap-3">
            <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#7f826f] font-bold">People</div>
                <h3 className="text-[#f2f2ef] text-[16px] font-semibold mt-1">People recognition is not enabled yet.</h3>
                <p className="text-[#9ca099] text-[12px] mt-1">This phase only prepares local-first structure for future manual assignment and safe face clustering research.</p>
            </div>
            <div className="rounded-xl bg-black/20 p-3 text-[12px] text-[#b8b59f]">
                <div>Create person label</div>
                <div>Assign selected photos manually</div>
                <div className="mt-2 text-[#7f826f]">{people.length} stored clusters</div>
            </div>
        </section>
    );
}
