import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRooms } from '@/hooks/useData';
import { useNavigate } from 'react-router-dom';

function getStatusDisplay(status: string) {
    switch (status) {
        case 'available': return { badge: <Badge variant="success">Available</Badge>, dot: 'bg-emerald-500' };
        case 'occupied': return { badge: <Badge variant="info">Occupied</Badge>, dot: 'bg-blue-500' };
        case 'maintenance': return { badge: <Badge variant="warning">Maintenance</Badge>, dot: 'bg-amber-500' };
        default: return { badge: <Badge variant="secondary">{status}</Badge>, dot: 'bg-gray-400' };
    }
}

export default function Rooms() {
    const { data: rooms, isLoading } = useRooms();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-notion-h2">Rooms</h1>
                    <p className="text-notion-caption mt-1">CostaSpine · {rooms?.length ?? 0} rooms</p>
                </div>
                <Button size="sm" className="h-8 text-[12px]">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Room
                </Button>
            </div>

            <div className="px-8 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    </div>
                ) : !rooms?.length ? (
                    <p className="text-[13px] text-muted-foreground text-center py-8">No rooms configured</p>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {rooms.map((room) => {
                            const statusInfo = getStatusDisplay(room.status);
                            return (
                                <div
                                    key={room.id}
                                    className="border border-border rounded-lg p-5 notion-row-hover cursor-pointer transition-shadow hover:shadow-sm"
                                    onClick={() => navigate(`/rooms/${room.id}`)}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2.5 w-2.5 rounded-full ${statusInfo.dot}`} />
                                            <div>
                                                <p className="text-[15px] font-medium">{room.name}</p>
                                                <p className="text-notion-caption">{room.type}</p>
                                            </div>
                                        </div>
                                        {statusInfo.badge}
                                    </div>

                                    {room.equipment?.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Equipment</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {room.equipment.map((eq: string) => (
                                                    <span key={eq} className="text-[11px] px-2 py-0.5 bg-muted rounded-md text-muted-foreground">{eq}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
