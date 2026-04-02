import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const REST_URL = `${SUPABASE_URL}/rest/v1`;

export const handlers = [
    http.get(`${REST_URL}/patients`, () => {
        return HttpResponse.json([]);
    }),
    
    http.get(`${REST_URL}/practitioners`, () => {
        return HttpResponse.json([]);
    }),
    
    http.get(`${REST_URL}/rooms`, () => {
        return HttpResponse.json([]);
    }),
    
    http.get(`${REST_URL}/appointments`, () => {
        return HttpResponse.json([]);
    }),
    
    http.get(`${REST_URL}/locations`, () => {
        return HttpResponse.json([]);
    }),
    
    http.get(`${REST_URL}/practitioner_schedules`, () => {
        return HttpResponse.json([]);
    }),

    // Catch-all for other Supabase REST GET endpoints
    http.get(`${REST_URL}/*`, () => {
        return HttpResponse.json([]);
    }),

    // Catch-all for POST
    http.post(`${REST_URL}/*`, () => {
        return HttpResponse.json({}, { status: 201 });
    }),

    // Catch-all for POST API Edge Functions
    http.post(`${SUPABASE_URL}/functions/v1/*`, () => {
        return HttpResponse.json({}, { status: 200 });
    })
];
