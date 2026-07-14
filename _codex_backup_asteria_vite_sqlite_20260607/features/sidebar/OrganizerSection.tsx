import { Calendar, Film, Image as ImageIcon, Inbox, MapPin, Shapes, Users } from 'lucide-react';

interface OrganizerSectionProps {
    onSelectCollection: (id: string) => void;
}

const organizerLinks = [
    { id: 'organizer_overview', label: 'Overview', icon: Shapes, collectionId: 'coll_unorganized' },
    { id: 'organizer_photos', label: 'Photos', icon: ImageIcon, collectionId: 'coll_photos' },
    { id: 'organizer_videos', label: 'Videos', icon: Film, collectionId: 'coll_videos' },
    { id: 'organizer_screenshots', label: 'Screenshots', icon: Inbox, collectionId: 'coll_screenshots' },
    { id: 'organizer_unorganized', label: 'Unorganized', icon: Calendar, collectionId: 'coll_unorganized' },
];

const soonLinks = [
    { id: 'organizer_duplicates', label: 'Possible Duplicates', icon: Inbox },
    { id: 'organizer_people', label: 'People, próximamente', icon: Users },
    { id: 'organizer_places', label: 'Places, próximamente', icon: MapPin },
    { id: 'organizer_events', label: 'Events, próximamente', icon: Calendar },
];

export function OrganizerSection({ onSelectCollection }: OrganizerSectionProps) {
    return (
        <div className="flex flex-col gap-1 px-3">
            <h3 className="text-[9px] font-bold text-[#7f826f] uppercase tracking-widest px-2 mb-1.5 font-sans">Organizer</h3>
            {organizerLinks.map(link => {
                const Icon = link.icon;
                return (
                    <button
                        key={link.id}
                        onClick={() => onSelectCollection(link.collectionId)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border border-transparent text-[#b8b59f] hover:bg-[#151818] hover:text-[#f2f2ef]"
                    >
                        <Icon className="w-3.5 h-3.5 text-[#7f826f]" />
                        <span className="text-[11px] font-semibold tracking-wide truncate flex-1 text-left">{link.label}</span>
                    </button>
                );
            })}
            <div className="mt-2 flex flex-col gap-1">
                {soonLinks.map(link => {
                    const Icon = link.icon;
                    return (
                        <div
                            key={link.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-transparent text-[#6f7468]"
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold tracking-wide truncate flex-1 text-left">{link.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
