import { create } from 'zustand';

interface UIState {
    // Sidebar
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;

    // Global search
    globalSearchQuery: string;
    setGlobalSearchQuery: (query: string) => void;

    // Active dropdown (used across listing pages)
    activeDropdown: string | null;
    setActiveDropdown: (id: string | null) => void;

    // Confirm dialog
    deleteConfirmId: string | null;
    setDeleteConfirmId: (id: string | null) => void;

    // Modal management
    activeModal: string | null;
    modalData: Record<string, unknown>;
    openModal: (modalId: string, data?: Record<string, unknown>) => void;
    closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    // Sidebar
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    // Global search
    globalSearchQuery: '',
    setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

    // Active dropdown
    activeDropdown: null,
    setActiveDropdown: (id) => set({ activeDropdown: id }),

    // Confirm dialog
    deleteConfirmId: null,
    setDeleteConfirmId: (id) => set({ deleteConfirmId: id }),

    // Modal management
    activeModal: null,
    modalData: {},
    openModal: (modalId, data = {}) => set({ activeModal: modalId, modalData: data }),
    closeModal: () => set({ activeModal: null, modalData: {} }),
}));
