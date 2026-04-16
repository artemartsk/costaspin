import { format, formatDistanceToNow } from 'date-fns';
import { usePatientActivity, ActivityEvent } from '@/hooks/usePatientActivity';
import { 
    Calendar, 
    FileText, 
    MessageCircle, 
    Phone, 
    User,
    CheckCircle2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function PatientActivitySidebar({ patientId }: { patientId: string }) {
    const { data: activities, isLoading } = usePatientActivity(patientId);

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!activities?.length) {
        return (
            <div className="w-full text-center text-[12px] text-muted-foreground mt-10">
                No activity history found.
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <h3 className="text-[14px] font-semibold tracking-tight text-foreground mb-6 flex items-center gap-2">
                Activity Timeline 
                <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-md font-mono">{activities.length}</span>
            </h3>

            <ScrollArea className="flex-1 -mx-4 px-4 overflow-y-auto">
                <div className="space-y-6 pb-12 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                    {activities.map((item, index) => (
                        <ActivityItem key={item.id} item={item} isLast={index === activities.length - 1} />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

function ActivityItem({ item, isLast }: { item: ActivityEvent, isLast: boolean }) {
    let Icon = User;
    let iconColor = 'text-slate-500';
    let iconBg = 'bg-slate-100 dark:bg-slate-800';

    switch (item.type) {
        case 'appointment':
            Icon = Calendar;
            iconColor = 'text-blue-500';
            iconBg = 'bg-blue-100 dark:bg-blue-900/40';
            break;
        case 'clinical_note':
            Icon = FileText;
            iconColor = 'text-purple-500';
            iconBg = 'bg-purple-100 dark:bg-purple-900/40';
            break;
        case 'whatsapp':
            Icon = MessageCircle;
            iconColor = 'text-emerald-500';
            iconBg = 'bg-emerald-100 dark:bg-emerald-900/40';
            break;
        case 'call':
            Icon = Phone;
            iconColor = 'text-amber-500';
            iconBg = 'bg-amber-100 dark:bg-amber-900/40';
            break;
        case 'system':
            Icon = item.title.includes('Forms') ? CheckCircle2 : User;
            iconColor = 'text-slate-500';
            iconBg = 'bg-slate-100 dark:bg-slate-800';
            break;
    }

    return (
        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Dot Node */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white dark:border-slate-950 bg-white dark:bg-slate-950 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10 mx-auto">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${iconBg}`}>
                    <Icon className={`h-3 w-3 ${iconColor}`} />
                </div>
            </div>

            {/* Content Box */}
            <div className={`w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] py-2 ${!isLast && 'mb-[-8px]'}`}>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-medium text-foreground">{item.title}</span>
                    {item.description && (
                        <span className="text-[11px] text-muted-foreground line-clamp-2">{item.description}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-1">
                        {formatDistanceToNow(item.date, { addSuffix: true })}
                        <span className="scale-75">•</span>
                        {format(item.date, 'MMM d, yyyy')}
                    </span>
                </div>
            </div>
        </div>
    );
}
