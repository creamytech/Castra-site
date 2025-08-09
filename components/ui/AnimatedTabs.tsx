"use client";
import { motion } from "framer-motion";
import clsx from "clsx";

export default function AnimatedTabs({ 
  tabs, 
  value, 
  onChange 
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative inline-flex gap-6 border-b border-white/10">
      {tabs.map(t => (
        <button 
          key={t.id} 
          onClick={() => onChange(t.id)}
          className={clsx(
            "relative pb-3 text-sm transition-opacity",
            value === t.id ? "text-white" : "text-white/60 hover:text-white/80"
          )}
        >
          {t.label}
          {value === t.id && (
            <motion.div 
              layoutId="tab-underline" 
              className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 to-cyan-400" 
            />
          )}
        </button>
      ))}
    </div>
  );
}
