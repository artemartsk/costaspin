import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import CalendarPage from '@/pages/Calendar';
import Patients from '@/pages/Patients';
import Practitioners from '@/pages/Practitioners';
import Rooms from '@/pages/Rooms';
import Analytics from '@/pages/Analytics';
import SettingsPage from '@/pages/Settings';
import VoiceAgent from '@/pages/VoiceAgent';
import WhatsApp from '@/pages/WhatsApp';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Toaster position="bottom-right" richColors />
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route element={<Layout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/calendar" element={<CalendarPage />} />
                            <Route path="/patients" element={<Patients />} />
                            <Route path="/practitioners" element={<Practitioners />} />
                            <Route path="/rooms" element={<Rooms />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/voice-agent" element={<VoiceAgent />} />
                            <Route path="/whatsapp" element={<WhatsApp />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
