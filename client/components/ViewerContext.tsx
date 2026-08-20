import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { executeApi } from "@/lib/executeApi.js";

export type Viewer = {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin?: boolean;
};

type ViewerContextType = {
  viewer: Viewer | null;
  setViewer: (viewer: Viewer) => void;
  logout: () => void;
  isLoading: boolean;
  lookupError: boolean;
};

const ViewerContext = createContext<ViewerContextType | undefined>(undefined);

const STORAGE_KEY = "cliptracker_viewer";

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewerState] = useState<Viewer | null>(() => {
    // Synchronous init from localStorage for instant rendering
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as Viewer;
    } catch { /* ignore */ }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lookupError, setLookupError] = useState(false);

  // Use the hook-based API call — this integrates properly with the Superblocks
  // runtime in both preview and deployed modes
  const {
    data: autoLookupData,
    loading: autoLookupLoading,
    isError: autoLookupError,
  } = useApiData("AutoLookupViewer", {});

  // When auto-lookup resolves, update the viewer
  useEffect(() => {
    if (autoLookupLoading) return; // Still loading — wait

    if (autoLookupData?.viewer) {
      const v: Viewer = {
        id: autoLookupData.viewer.id,
        email: autoLookupData.viewer.email,
        name: autoLookupData.viewer.name,
        role: autoLookupData.viewer.role,
        isAdmin: autoLookupData.viewer.isAdmin ?? false,
      };
      setViewerState(v);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
      setLookupError(false);
      setIsLoading(false);
      return;
    }

    // Auto-lookup returned no viewer
    if (autoLookupError) {
      // API errored — check localStorage fallback
      if (viewer) {
        // We have a cached viewer, use it and refresh in background
        setLookupError(false);
        setIsLoading(false);
        refreshFromDb(viewer.email);
      } else {
        setLookupError(true);
        setIsLoading(false);
      }
    } else {
      // API succeeded but no match — check localStorage fallback
      if (viewer) {
        // Cached viewer exists, refresh it
        setLookupError(false);
        setIsLoading(false);
        refreshFromDb(viewer.email);
      } else {
        // Genuinely new user
        setLookupError(false);
        setIsLoading(false);
      }
    }
  }, [autoLookupLoading, autoLookupData, autoLookupError]); // eslint-disable-line react-hooks/exhaustive-deps

  // Background refresh from DB to pick up isAdmin changes
  const refreshFromDb = useCallback((email: string) => {
    executeApi("LookupViewer", { email })
      .then((lookupResult: any) => {
        if (lookupResult?.viewer) {
          const refreshed: Viewer = {
            id: lookupResult.viewer.id,
            email: lookupResult.viewer.email,
            name: lookupResult.viewer.name,
            role: lookupResult.viewer.role,
            isAdmin: lookupResult.viewer.isAdmin ?? false,
          };
          setViewerState(refreshed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
        }
      })
      .catch(() => { /* ignore — stale local data is fine */ });
  }, []);

  const setViewer = useCallback((v: Viewer) => {
    setViewerState(v);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  }, []);

  const logout = useCallback(() => {
    setViewerState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ViewerContext.Provider value={{ viewer, setViewer, logout, isLoading, lookupError }}>
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used within ViewerProvider");
  return ctx;
}
