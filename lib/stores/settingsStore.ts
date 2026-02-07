// Settings Store (Zustand)
// Manages app settings including UI preferences

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  // UI Settings
  showConnectionIndicator: boolean;
  
  // Actions
  setShowConnectionIndicator: (show: boolean) => void;
  toggleConnectionIndicator: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default: show the indicator
      showConnectionIndicator: true,
      
      setShowConnectionIndicator: (show: boolean) => 
        set({ showConnectionIndicator: show }),
      
      toggleConnectionIndicator: () => 
        set((state) => ({ showConnectionIndicator: !state.showConnectionIndicator })),
    }),
    {
      name: 'biascoach-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useSettingsStore;

