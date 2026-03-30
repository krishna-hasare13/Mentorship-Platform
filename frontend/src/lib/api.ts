/**
 * API Utility for Mentorspace
 * Handles robust communication with the backend
 */

export const getBackendUrl = () => {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!url) {
        console.error('NEXT_PUBLIC_BACKEND_URL is not defined in environment variables!');
        return '';
    }
    // Remove trailing slash if present
    return url.replace(/\/$/, '');
};

interface FetchOptions extends RequestInit {
    token?: string;
}

export const apiFetch = async (endpoint: string, options: FetchOptions = {}) => {
    const baseUrl = getBackendUrl();
    if (!baseUrl && !endpoint.startsWith('http')) {
        throw new Error('Backend URL is not configured. Please set NEXT_PUBLIC_BACKEND_URL.');
    }

    const { token, ...fetchOptions } = options;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = new Headers(fetchOptions.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response from backend:', {
                status: response.status,
                url: url,
                bodySnippet: text.substring(0, 200)
            });
            
            if (text.includes('<!DOCTYPE html>')) {
                throw new Error(`The backend at ${url} returned an HTML page instead of JSON. This usually means the URL is incorrect or the service is down.`);
            }
            throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
        }

        const data = await response.json();
        
        if (!response.ok) {
            const errorMessage = data.detailed || data.error || data.message || `API Error: ${response.status}`;
            throw new Error(errorMessage);
        }

        return data;
    } catch (error: any) {
        console.error('API Fetch Error:', error);
        throw error;
    }
};
