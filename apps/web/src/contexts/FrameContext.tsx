import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface FrameContextType {
  framed: boolean;
  toggleFramed: () => void;
}

const FrameContext = createContext<FrameContextType | null>(null);

function getInitialFramed(): boolean {
  const saved = localStorage.getItem("framed");
  if (saved === "false" || saved === "true") return saved === "true";
  return true;
}

export function FrameProvider({ children }: { children: ReactNode }) {
  const [framed, setFramed] = useState<boolean>(getInitialFramed);

  useEffect(() => {
    localStorage.setItem("framed", String(framed));
  }, [framed]);

  const toggleFramed = useCallback(() => {
    setFramed((prev) => !prev);
  }, []);

  return (
    <FrameContext.Provider value={{ framed, toggleFramed }}>
      {children}
    </FrameContext.Provider>
  );
}

export function useFrame() {
  const ctx = useContext(FrameContext);
  if (!ctx) throw new Error("useFrame must be used within FrameProvider");
  return ctx;
}
