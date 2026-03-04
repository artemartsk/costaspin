import { Construction } from 'lucide-react';

export default function ComingSoon() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center max-w-md">
                <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Construction className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-[22px] font-semibold tracking-tight mb-2">
                    Coming Soon
                </h1>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                    We're building something great. This section is currently under development and will be available in an upcoming release.
                </p>
                <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-muted-foreground/60">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    In Development
                </div>
            </div>
        </div>
    );
}
