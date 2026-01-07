import { create } from 'zustand'

export const useUserStore = create((set) => ({
    isLoggedIn: false,
    username: '',
    role: '',
    setIsLoggedIn: (status) => set({ isLoggedIn: status }),
    setUsername: (name) => set({ username: name }),
    setRole: (userRole) => set({ role: userRole }),
}))