import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import CalendarPage from '@/pages/Calendar';
import Patients from '@/pages/Patients';
import Practitioners from '@/pages/Practitioners';
import Rooms from '@/pages/Rooms';
import Analytics from '@/pages/Analytics';
import SettingsPage from '@/pages/Settings';
import VoiceAgent from '@/pages/VoiceAgent';
import WhatsApp from '@/pages/WhatsApp';
import PatientForms from '@/pages/PatientForms';
import PatientDetail from '@/pages/PatientDetail';
import MyCalendar from '@/pages/MyCalendar';
import PrivacyPolicy from '@/pages/PrivacyPolicy';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Toaster position="bottom-right" richColors />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/forms/:token" element={<PatientForms />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route element={<Layout />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/calendar" element={<CalendarPage />} />
                                <Route path="/my-calendar" element={<MyCalendar />} />
                                <Route path="/patients" element={<Patients />} />
                                <Route path="/patients/:id" element={<PatientDetail />} />
                                <Route path="/practitioners" element={<Practitioners />} />
                                <Route path="/rooms" element={<Rooms />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/settings" element={<SettingsPage />} />
                                <Route path="/voice-agent" element={<VoiceAgent />} />
                                <Route path="/whatsapp" element={<WhatsApp />} />
                            </Route>
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
