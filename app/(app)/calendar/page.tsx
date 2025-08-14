"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Toast from "@/components/Toast";
import FadeIn from "@/components/ui/FadeIn";
import { motion, AnimatePresence } from "framer-motion";
import { Segmented } from "@/components/ui/Segmented";

export const dynamic = "force-dynamic";

interface CalEvent {
  id: string;
  summary: string;
  startISO: string;
  endISO: string;
  attendees?: string[];
  description?: string;
  location?: string;
  hangoutLink?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

function toRFC3339WithOffset(local: string) {
  // local is from input type="datetime-local" like "2025-08-09T14:30"
  const d = new Date(local);
  const tzOffsetMin = d.getTimezoneOffset();
  const sign = tzOffsetMin > 0 ? "-" : "+";
  const abs = Math.abs(tzOffsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  const iso = new Date(
    d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), 0
  );
  const yyyy = iso.getFullYear();
  const mo = String(iso.getMonth() + 1).padStart(2, "0");
  const day = String(iso.getDate()).padStart(2, "0");
  const H = String(iso.getHours()).padStart(2, "0");
  const M = String(iso.getMinutes()).padStart(2, "0");
  const S = String(iso.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mo}-${day}T${H}:${M}:${S}${sign}${hh}:${mm}`;
}

export default function CalendarPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="mt-2 text-sm text-gray-600">Calendar integrations are temporarily disabled while we rebuild with client-side encryption.</p>
    </div>
  )
}
