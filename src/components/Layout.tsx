import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    CalendarCheck2,
    Users,
    UserCog,
    DoorOpen,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Phone,
    MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Practitioners', href: '/practitioners', icon: UserCog },
];

const secondaryNav: typeof navigation = [];

const bottomNav = [
    { name: 'Settings', href: '/settings', icon: Settings },
];

function SidebarItem({
    item,
    isActive,
    collapsed,
}: {
    item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
    isActive: boolean;
    collapsed: boolean;
}) {
    const content = (
        <Link
            to={item.href}
            className={cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
        >
            <item.icon className="h-[16px] w-[16px] shrink-0" />
            {!collapsed && <span>{item.name}</span>}
        </Link>
    );

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right">{item.name}</TooltipContent>
            </Tooltip>
        );
    }

    return content;
}

export function Layout() {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex h-screen w-full overflow-hidden">
                {/* Sidebar */}
                <aside
                    className={cn(
                        'h-full flex flex-col border-r border-border bg-[hsl(210_15%_98%)] transition-all duration-200',
                        collapsed ? 'w-[52px]' : 'w-[220px]'
                    )}
                >
                    {/* Logo */}
                    <div className={cn('flex items-center h-12 px-3', collapsed ? 'justify-center' : 'gap-2.5')}>
                        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                            <img src="/logo.png" alt="CS" className="h-5 w-5 object-contain" />
                        </div>
                        {!collapsed && (
                            <span className="text-[13px] font-semibold tracking-tight text-foreground">CostaSpine</span>
                        )}
                    </div>

                    <ScrollArea className="flex-1 px-2">
                        {/* Main Nav */}
                        <div className="space-y-0.5 py-2">
                            {navigation.map((item) => {
                                const isActive =
                                    location.pathname === item.href ||
                                    (item.href !== '/' && location.pathname.startsWith(item.href));
                                return (
                                    <SidebarItem
                                        key={item.name}
                                        item={item}
                                        isActive={isActive}
                                        collapsed={collapsed}
                                    />
                                );
                            })}
                        </div>

                        <Separator className="mx-0.5" />

                        {/* Integrations */}
                        <div className="space-y-0.5 py-2">
                            {!collapsed && (
                                <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                                    Integrations
                                </p>
                            )}
                            {secondaryNav.map((item) => {
                                const isActive = location.pathname.startsWith(item.href);
                                return (
                                    <SidebarItem
                                        key={item.name}
                                        item={item}
                                        isActive={isActive}
                                        collapsed={collapsed}
                                    />
                                );
                            })}
                        </div>

                        <Separator className="mx-0.5" />

                        {/* Bottom */}
                        <div className="space-y-0.5 py-2">
                            {bottomNav.map((item) => {
                                const isActive = location.pathname.startsWith(item.href);
                                return (
                                    <SidebarItem
                                        key={item.name}
                                        item={item}
                                        isActive={isActive}
                                        collapsed={collapsed}
                                    />
                                );
                            })}
                        </div>
                    </ScrollArea>

                    {/* Collapse Toggle */}
                    <div className="border-t border-border p-2">
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
                        >
                            {collapsed ? (
                                <ChevronRight className="h-3.5 w-3.5" />
                            ) : (
                                <>
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    <span>Collapse</span>
                                </>
                            )}
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-background">
                    <Outlet />
                </main>
            </div>
        </TooltipProvider>
    );
}
