import axios from 'axios';

const API_BASE_URL = `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5121').replace(/\/$/, '')}/api/`;

let getAccessTokenFn: (() => Promise<string | null>) | null = null;

export function setAccessTokenGetter(fn: () => Promise<string | null>) {
    getAccessTokenFn = fn;
}

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
    if (getAccessTokenFn) {
        const token = await getAccessTokenFn();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Guard against SSR where window is not available
            if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
            }
        }
        return Promise.reject(error);
    },
);

export { apiClient };