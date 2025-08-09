"use client";
import { motion } from "framer-motion";

export default function FadeIn({ 
  children, 
  delay = 0, 
  stagger = 0 
}: {
  children: React.ReactNode;
  delay?: number;
  stagger?: number;
}) {
  const variants = {
    hidden: { opacity: 0, y: 8 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        delay, 
        staggerChildren: stagger, 
        duration: 0.18 
      } 
    },
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
