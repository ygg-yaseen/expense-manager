import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  // Parse initial selected date or default today
  const initialDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
  
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  const todayStr = new Date().toISOString().slice(0, 10);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Generate days grid for current year & month
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const daysGrid: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = totalDaysInPrevMonth - i;
    const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    daysGrid.push({ day, isCurrentMonth: false, dateStr });
  }

  // Current month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    daysGrid.push({ day, isCurrentMonth: true, dateStr });
  }

  // Next month leading days to complete 35 or 42 cells
  const remainingCells = (42 - daysGrid.length) % 7 === 0 && daysGrid.length > 35 ? 0 : 35 - (daysGrid.length % 35);
  for (let day = 1; day <= remainingCells; day++) {
    const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    daysGrid.push({ day, isCurrentMonth: false, dateStr });
  }

  const handleDayClick = (dateStr: string) => {
    onSelectDate(dateStr);
    onClose();
  };

  const handleSelectToday = () => {
    onSelectDate(todayStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">Select Date</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month & Year Navigation Bar */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-extrabold text-slate-100 tracking-wide">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 py-1">
          {DAYS_OF_WEEK.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {daysGrid.map((item, index) => {
            const isSelected = item.dateStr === selectedDate;
            const isToday = item.dateStr === todayStr;

            return (
              <button
                key={index}
                onClick={() => handleDayClick(item.dateStr)}
                className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400 scale-105'
                    : isToday
                    ? 'border-2 border-indigo-500/60 text-indigo-400 font-bold bg-indigo-500/10'
                    : item.isCurrentMonth
                    ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-800/40'
                }`}
              >
                {item.day}
              </button>
            );
          })}
        </div>

        {/* Quick Footer Action */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <button
            onClick={handleSelectToday}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-bold border border-indigo-500/30 transition cursor-pointer"
          >
            Set Today
          </button>

          <span className="text-[11px] text-slate-400 font-medium">
            Selected: <strong className="text-slate-200">{selectedDate || todayStr}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
