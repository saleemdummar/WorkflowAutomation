import * as signalR from '@microsoft/signalr';

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
    private tokenFactory: (() => Promise<string | null>) | null = null;
    private reconnectAttempts = 0;
    private isManuallyDisconnected = false;

    /**
     * Set the token factory used for Bearer auth.
     * Call this once from AuthContext after the UserManager is initialised.
     */
    setTokenFactory(fn: () => Promise<string | null>) {
        this.tokenFactory = fn;
    }

    async connect(token?: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            return;
        }

        this.isManuallyDisconnected = false;
        this.reconnectAttempts = 0;

        const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5121').replace(/\/$/, '');

        // Prefer dynamic token factory (from AuthContext), fall back to static token, then cookie auth
        const connectionOptions: signalR.IHttpConnectionOptions = this.tokenFactory
            ? { accessTokenFactory: async () => (await this.tokenFactory!()) ?? '' }
            : token
                ? { accessTokenFactory: () => token }
                : { withCredentials: true };

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(`${apiBaseUrl}/hubs/notifications`, connectionOptions)
            .withAutomaticReconnect({
                nextRetryDelayInMilliseconds: (retryContext) => {
                    if (retryContext.previousRetryCount >= MAX_RECONNECT_ATTEMPTS) {
                        return null; // Stop retrying
                    }
                    // Exponential backoff with jitter
                    const delay = Math.min(
                        BASE_RECONNECT_DELAY_MS * Math.pow(2, retryContext.previousRetryCount),
                        MAX_RECONNECT_DELAY_MS,
                    );
                    return delay + Math.random() * 1000;
                },
            })
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        this.connection.onreconnecting((error) => {
            this.reconnectAttempts++;
            console.warn(`SignalR reconnecting (attempt ${this.reconnectAttempts})...`, error?.message);
        });

        this.connection.onreconnected(() => {
            this.reconnectAttempts = 0;
            console.info('SignalR reconnected successfully');
        });

        this.connection.onclose((error) => {
            if (!this.isManuallyDisconnected) {
                console.warn('SignalR connection closed:', error?.message);
                this.attemptReconnect(token);
            }
        });

        try {
            await this.connection.start();
            this.reconnectAttempts = 0;
            this.setupListeners();
        } catch (error) {
            console.error('SignalR initial connection error:', error);
            this.attemptReconnect(token);
        }
    }

    /**
     * Reconnect with exponential backoff when automatic reconnection exhausts its attempts.
     */
    private attemptReconnect(token?: string) {
        if (this.isManuallyDisconnected) return;
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`SignalR: giving up after ${MAX_RECONNECT_ATTEMPTS} reconnect attempts`);
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(
            BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts),
            MAX_RECONNECT_DELAY_MS,
        );

        console.info(`SignalR: reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(token), delay);
    }

    private setupListeners() {
        if (!this.connection) return;
        this.listeners.forEach((callbacks, eventName) => {
            callbacks.forEach(callback => {
                this.connection?.on(eventName, callback);
            });
        });
    }

    async disconnect() {
        this.isManuallyDisconnected = true;
        this.reconnectAttempts = 0;
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }

    on(eventName: string, callback: (...args: unknown[]) => void) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)!.add(callback);
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            this.connection.on(eventName, callback);
        }
    }

    off(eventName: string, callback: (...args: unknown[]) => void) {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.listeners.delete(eventName);
            }
        }

        if (this.connection) {
            this.connection.off(eventName, callback);
        }
    }

    isConnected(): boolean {
        return this.connection?.state === signalR.HubConnectionState.Connected;
    }
}

export const signalRService = new SignalRService();
