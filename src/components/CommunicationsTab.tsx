import { format } from 'date-fns';
import { Phone, MessageCircle, Clock, ChevronDown } from 'lucide-react';
import type { Patient } from '@/types';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePatientCommunications } from '@/hooks/useData';

export function CommunicationsTab({ patientId }: { patientId: string }) {
    const { data: timeline, isLoading } = usePatientCommunications(patientId);

    if (isLoading) {
        return <div className="p-8 text-center text-sm text-muted-foreground">Loading timeline...</div>;
    }

    if (!timeline?.length) {
        return (
            <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground flex flex-col items-center justify-center h-[200px]">
                <MessageCircle className="h-8 w-8 mb-4 opacity-50" />
                <p className="text-[13px]">No communications recorded yet.</p>
            </div>
        );
    }

    // Grouping by date
    const groupedByDate: Record<string, typeof timeline> = {};
    timeline.forEach(event => {
        const dateStr = format(event.date, 'dd MMMM yyyy');
        if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
        groupedByDate[dateStr].push(event);
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {Object.entries(groupedByDate).map(([dateStr, events]) => (
                <div key={dateStr} className="space-y-6">
                    {/* Date Header */}
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
                        <Badge variant="outline" className="text-[11px] font-medium px-3 py-1 bg-muted/30">
                            {dateStr}
                        </Badge>
                    </div>

                    <div className="relative pl-6 ml-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-8">
                        {events.map((event, i) => {
                            const isCall = event.type === 'call';
                            const Icon = isCall ? Phone : MessageCircle;
                            const tTime = format(event.date, 'HH:mm');
                            
                            return (
                                <div key={`${event.type}-${i}`} className="relative">
                                    {/* Timeline Node Icon */}
                                    <div className="absolute -left-[35px] top-1 h-7 w-7 rounded-full border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center shadow-sm">
                                        <Icon className={`h-3 w-3 ${isCall ? 'text-primary' : 'text-emerald-500'}`} />
                                    </div>

                                    {/* Content Card */}
                                    {isCall ? (
                                        <CallNode call={event.data as any} time={tTime} />
                                    ) : (
                                        <WhatsAppNode thread={event.data as any} time={tTime} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── SUBCOMPONENTS ──────────────────────────────

function CallNode({ call, time }: { call: any, time: string }) {
    const isCompleted = call.status === 'completed';
    
    return (
        <Card className="shadow-none border-border relative overflow-hidden">
            {/* Soft accent top border based on status */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${isCompleted ? 'bg-primary' : 'bg-red-500'}`} />
            
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                        <h4 className="text-[13px] font-medium flex items-center gap-2">
                            AI Phone Call ({call.direction === 'inbound' ? 'Inbound' : 'Outbound'})
                            <span className="text-[11px] text-muted-foreground ml-2">• {time}</span>
                            {call.duration_seconds && (
                                <span className="text-[11px] text-muted-foreground">({Math.round(call.duration_seconds/60)} min)</span>
                            )}
                        </h4>
                    </div>
                    <Badge 
                        variant={isCompleted ? "success" : "destructive"} 
                        className="text-[10px] uppercase font-semibold h-5"
                    >
                        {call.status}
                    </Badge>
                </div>

                {call.recording_url && (
                    <div className="mb-4 bg-muted/20 p-3 rounded-lg border border-border/50">
                        <audio controls className="w-full h-8" src={call.recording_url}>
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                )}

                {call.transcript && (
                    <Accordion type="single" collapsible className="w-full border rounded-lg bg-muted/10">
                        <AccordionItem value="transcript" className="border-b-0">
                            <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/30 text-[12px] font-medium text-muted-foreground group">
                                <span className="flex items-center gap-2">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    Show Transcript
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-1">
                                <div className="text-[12px] whitespace-pre-wrap leading-relaxed space-y-2 mt-2 border-l-2 pl-3 border-muted-foreground/30">
                                    {call.transcript}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}

function WhatsAppNode({ thread, time }: { thread: any, time: string }) {
    const messages = thread.messages || [];
    
    return (
        <Card className="shadow-none border-border relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                        <h4 className="text-[13px] font-medium flex items-center gap-2">
                            WhatsApp Thread
                            <span className="text-[11px] text-muted-foreground ml-2">• {time}</span>
                        </h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-muted/30 border-emerald-500/30 text-emerald-600">
                        {thread.status}
                    </Badge>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-border/50 p-4">
                    <ScrollArea className="h-auto max-h-[300px] w-full pr-4">
                        <div className="space-y-4">
                            {messages.length === 0 ? (
                                <p className="text-[12px] text-muted-foreground italic">No messages transferred</p>
                            ) : (
                                messages.map((msg: any, idx: number) => {
                                    const isAssistant = msg.role === 'assistant';
                                    return (
                                        <div key={idx} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`
                                                max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px]
                                                ${isAssistant 
                                                    ? 'bg-white dark:bg-slate-800 border border-border text-foreground rounded-tl-sm' 
                                                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-950 dark:text-emerald-100 rounded-tr-sm'
                                                }
                                            `}>
                                                <div className="font-semibold text-[10px] opacity-50 mb-1 tracking-wide uppercase">
                                                    {isAssistant ? 'CostaSpine AI' : 'Patient'}
                                                </div>
                                                <div className="leading-relaxed whitespace-pre-wrap">
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
