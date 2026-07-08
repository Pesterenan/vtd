import { useContext } from "react";
import { LoadingContext } from "../contexts/LoadingContext";
import type { LoadingContextValue } from "../contexts/LoadingContext";

export const useLoading = (): LoadingContextValue => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return ctx;
};
