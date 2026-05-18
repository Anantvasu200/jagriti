import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, Wallet, AlertCircle, Siren, Eye,
  Calendar, Search
} from 'lucide-react';

const CRIME_TYPES = [
  { value: 'all',        label: 'All Incidents', icon: Map,          accent: '#64748b' },
  { value: 'theft',      label: 'Theft',         icon: Wallet,       accent: '#f97316' },
  { value: 'harassment', label: 'Harassment',    icon: AlertCircle,  accent: '#ef4444' },
  { value: 'assault',    label: 'Assault',       icon: Siren,        accent: '#dc2626' },
  { value: 'suspicious', label: 'Suspicious',    icon: Eye,          accent: '#eab308' },
]

const LEGEND = [
  { label: 'Theft',      color: '#f97316' },
  { label: 'Harassment', color: '#ef4444' },
  { label: 'Assault',    color: '#dc2626' },
  { label: 'Suspicious', color: '#eab308' },
]

const AnimatedMenuToggle = ({
  toggle,
  isOpen,
}) => (
  <button
    onClick={toggle}
    aria-label="Toggle menu"
    className="focus:outline-none z-[999]"
  >
    <motion.div animate={{ y: isOpen ? 13 : 0 }} transition={{ duration: 0.3 }}>
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        transition={{ duration: 0.3 }}
        className="text-black"
      >
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 2.5 L 22 2.5" },
            open: { d: "M 3 16.5 L 17 2.5" },
          }}
        />
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 12 L 22 12", opacity: 1 },
            open: { opacity: 0 },
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: "M 2 21.5 L 22 21.5" },
            open: { d: "M 3 2.5 L 17 16.5" },
          }}
        />
      </motion.svg>
    </motion.div>
  </button>
);

const CollapsibleSection = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-4">
      <button
        className="w-full flex items-center justify-between py-2 px-4 rounded-xl hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-gray-800">{title}</span>
        {open ? <XIcon /> : <MenuIcon />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuIcon = () => (
  <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <motion.line x1="3" y1="12" x2="21" y2="12" />
  </motion.svg>
);

const XIcon = () => (
  <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <motion.line x1="18" y1="6" x2="6" y2="18" />
    <motion.line x1="6" y1="6" x2="18" y2="18" />
  </motion.svg>
);

export default function Sidebar({ filters, setFilters }) {
  const [isOpen, setIsOpen] = useState(true);
  const [localStartDate, setLocalStartDate] = useState(filters.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(filters.endDate || '');

  const mobileSidebarVariants = {
    hidden: { x: "-100%" },
    visible: { x: 0 },
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleSearch = (start, end) => {
    setFilters(f => ({ 
      ...f, 
      startDate: start, 
      endDate: end,
      searchTrigger: (f.searchTrigger || 0) + 1 
    }));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-black border border-gray-200 rounded-2xl overflow-hidden pointer-events-auto">
      {/* Navigation / Filters Section */}
      <nav className="flex-1 p-4 overflow-y-auto pt-6">
        
        {/* Crime Type Section */}
        <CollapsibleSection title="Crime Categories">
          <ul className="flex flex-col gap-1">
            {CRIME_TYPES.map(({ value, label, icon: Icon, accent }) => {
              const isActive = filters.crimeType === value;
              return (
                <li key={value}>
                  <button 
                    onClick={() => setFilters(f => ({ ...f, crimeType: value }))}
                    className={`flex gap-3 font-medium text-sm items-center w-full py-2.5 px-3 rounded-xl transition-all duration-200
                      ${isActive ? 'bg-gray-100 shadow-sm border border-gray-200' : 'hover:bg-gray-50 border border-transparent'}
                    `}
                  >
                    <Icon className="h-5 w-5 shrink-0" style={{ color: isActive ? accent : '#64748b' }} />
                    <span className={isActive ? 'text-gray-900' : 'text-gray-600'}>{label}</span>
                    <span className={`ml-auto w-2 h-2 rounded-full shrink-0 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} style={{ background: accent }} />
                  </button>
                </li>
              )
            })}
          </ul>
        </CollapsibleSection>

        {/* Data Source Section */}
        <div className="mt-2">
          <CollapsibleSection title="Data Source">
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'both' }))}
                className={`flex-1 text-center py-2 px-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer
                  ${filters.dataSource === 'both' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                Both
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'live' }))}
                className={`flex-1 text-center py-2 px-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer
                  ${filters.dataSource === 'live' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                Live RSS
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'ncrb' }))}
                className={`flex-1 text-center py-2 px-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer
                  ${filters.dataSource === 'ncrb' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                NCRB
              </button>
            </div>
          </CollapsibleSection>
        </div>

        {/* Date Range Section */}
        <div className="mt-2">
          <CollapsibleSection title="Date Filter">
            <div className="flex flex-col gap-3 px-1">
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setLocalStartDate(today);
                  setLocalEndDate(today);
                  handleSearch(today, today);
                }}
                className="w-full text-xs font-semibold rounded-lg px-2 py-2 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150"
              >
                Today Only
              </button>
              
              <div className="flex gap-2 items-center">
                <div className="flex flex-col flex-1 gap-1">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-gray-500">From</span>
                  <input 
                    type="date" 
                    value={localStartDate}
                    onChange={(e) => setLocalStartDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col flex-1 gap-1">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-gray-500">To</span>
                  <input 
                    type="date" 
                    value={localEndDate}
                    onChange={(e) => setLocalEndDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setLocalStartDate('');
                    setLocalEndDate('');
                    handleSearch('', '');
                  }}
                  className="flex-1 text-[0.7rem] font-medium text-gray-600 hover:text-gray-900 transition-colors py-2 border border-gray-200 rounded-lg hover:bg-gray-100"
                >
                  Clear
                </button>
                <button
                  onClick={() => handleSearch(localStartDate, localEndDate)}
                  className="flex-1 text-[0.75rem] font-bold text-white bg-cyan-600 hover:bg-cyan-700 transition-colors py-2 rounded-lg shadow-md flex items-center justify-center gap-1"
                >
                  <Search size={14} strokeWidth={3} /> Search
                </button>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Legend */}
        <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-gray-500 block mb-3">Map Legend</span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            {LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="shrink-0 w-2.5 h-2.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 5px ${color}88` }}
                />
                <span className="text-xs text-gray-600 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

      </nav>
      
      {/* Footer / Action Button */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button 
          onClick={toggleSidebar}
          className="w-full font-medium text-sm p-2 text-center bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 shadow-sm transition-colors md:hidden"
        >
          Close Sidebar
        </button>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000] flex">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={mobileSidebarVariants}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-y-0 left-0 w-80 z-50 pointer-events-auto"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar Container (Fixed left) */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="hidden md:block fixed top-[110px] left-4 bottom-4 w-72 z-50 pointer-events-auto"
          >
            <div className="h-full relative shadow-[0_15px_50px_-12px_rgba(0,0,0,0.15)] rounded-2xl">
              <SidebarContent />
              
              {/* Desktop Pull-tab to close */}
              <button
                onClick={toggleSidebar}
                title="Collapse Sidebar"
                className="absolute -right-5 top-1/2 -translate-y-1/2 w-5 h-16 bg-white border border-gray-200 border-l-0 rounded-r-xl shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-50 hover:w-6 hover:-right-6 transition-all duration-200 group z-[-1]"
              >
                <div className="w-[3px] h-[3px] rounded-full bg-gray-300 group-hover:bg-cyan-400 transition-colors" />
                <div className="w-[3px] h-[3px] rounded-full bg-gray-300 group-hover:bg-cyan-400 transition-colors" />
                <div className="w-[3px] h-[3px] rounded-full bg-gray-300 group-hover:bg-cyan-400 transition-colors" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <div className="pointer-events-auto fixed top-[110px] left-4 z-[999]">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="bg-white p-2 rounded-xl shadow-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Mobile Toggle inside header area (Optional, since we have the floating button) */}
      <div className="md:hidden pointer-events-auto fixed top-4 right-4 z-[1001]">
        {!isOpen && (
          <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-200">
             <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
          </div>
        )}
      </div>
    </div>
  );
}