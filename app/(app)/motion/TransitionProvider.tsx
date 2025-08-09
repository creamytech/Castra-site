"use client";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function TransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  if (reduced) return <>{children}</>;

  const variants = { 
    initial: { opacity: 0, y: 8 }, 
    animate: { opacity: 1, y: 0 }, 
    exit: { opacity: 0, y: -8 } 
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={pathname} 
        initial="initial" 
        animate="animate" 
        exit="exit" 
        variants={variants} 
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
