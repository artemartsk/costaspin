import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const rooms = [
    { id: '1', name: 'Room 1', type: 'Chiropractic', equipment: ['Adjustment table', 'Decompression unit'], status: 'available', currentPatient: null },
    { id: '2', name: 'Room 2', type: 'Massage', equipment: ['Massage table', 'Hot stones kit', 'Aromatherapy'], status: 'occupied', currentPatient: 'Ana López' },
    { id: '3', name: 'Physio Suite', type: 'Physiotherapy', equipment: ['Ultrasound', 'TENS', 'Exercise area', 'Resistance bands'], status: 'occupied', currentPatient: 'David Brown' },
    { id: '4', name: 'Room 3', type: 'General', equipment: ['Examination table', 'Computer'], status: 'maintenance', currentPatient: null },
];

function getStatusDisplay(status: string) {
    switch (status) {
        case 'available': return { badge: <Badge variant="success">Available</Badge>, dot: 'bg-emerald-500' };
        case 'occupied': return { badge: <Badge variant="info">Occupied</Badge>, dot: 'bg-blue-500' };
        case 'maintenance': return { badge: <Badge variant="warning">Maintenance</Badge>, dot: 'bg-amber-500' };
        default: return { badge: <Badge variant="secondary">{status}</Badge>, dot: 'bg-gray-400' };
    }
}

export default function Rooms() {
    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-notion-h2">Rooms</h1>
                    <p className="text-notion-caption mt-1">CostaSpine Elviria · {rooms.length} rooms</p>
                </div>
                <Button size="sm" className="h-8 text-[12px]">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Room
                </Button>
            </div>

            <div className="px-8 py-6">
                <div className="grid grid-cols-2 gap-4">
                    {rooms.map((room) => {
                        const statusInfo = getStatusDisplay(room.status);
                        return (
                            <div key={room.id} className="border border-border rounded-lg p-5 notion-row-hover">
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

                                {room.currentPatient && (
                                    <div className="mb-3 px-3 py-2 bg-muted/50 rounded-md">
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Current Patient</p>
                                        <p className="text-[13px] font-medium">{room.currentPatient}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Equipment</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {room.equipment.map((eq) => (
                                            <span key={eq} className="text-[11px] px-2 py-0.5 bg-muted rounded-md text-muted-foreground">{eq}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
