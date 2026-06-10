import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import { LoadingContext } from "src/contexts/LoadingContext";
import LoadingOverlay from "./LoadingOverlay";

const DELAY_MS = 100;

const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const { on } = useEventBus();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg?: string) => {
    if (timerRef.current) return;
    setMessage(msg ?? "");
    timerRef.current = setTimeout(() => {
      setIsLoading(true);
      timerRef.current = null;
    }, DELAY_MS);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    setIsLoading(false);
    setMessage("");
  }, []);

  useEffect(() => {
    const unsubs = [
      on("loading:show", (payload) => show(payload)),
      on("loading:hide", () => hide()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on, show, hide]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, message, show, hide }}>
      <LoadingOverlay />
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingProvider;
