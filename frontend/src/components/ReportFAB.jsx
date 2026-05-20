import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function ReportFAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        absolute bottom-6 right-4 md:bottom-8 md:right-24 z-[1000]
        flex items-center justify-center gap-2
        bg-gradient-to-r from-orange-500 to-amber-600
        hover:from-orange-400 hover:to-amber-500
        text-white font-semibold rounded-full
        p-3.5 sm:px-6 sm:py-4
        shadow-[0_8px_32px_rgba(249,115,22,0.4)]
        transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(249,115,22,0.6)]
        active:translate-y-0 active:scale-95
        cursor-pointer shrink-0
      "
    >
      <Plus size={20} strokeWidth={3} className="shrink-0" />
      <span className="hidden sm:inline text-sm md:text-base">Report Incident</span>
    </button>
  )
}
