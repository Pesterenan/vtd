import { createContext } from "react";

export interface LoadingContextValue {
  isLoading: boolean;
  message: string;
  show: (message?: string) => void;
  hide: () => void;
}

export const LoadingContext = createContext<LoadingContextValue | null>(null);
