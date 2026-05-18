import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function ReportFAB({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        absolute bottom-8 right-24 z-[1000]
        flex items-center gap-2
        bg-gradient-to-r from-orange-500 to-amber-600
        hover:from-orange-400 hover:to-amber-500
        text-white font-semibold px-6 py-4 rounded-full
        shadow-[0_8px_32px_rgba(249,115,22,0.4)]
        transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(249,115,22,0.6)]
        active:translate-y-0 active:scale-95
        cursor-pointer
      "
    >
      <Plus size={20} strokeWidth={3} />
      <span>Report Incident</span>
    </button>
  )
}
