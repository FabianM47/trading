'use client';

import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  maxDate?: Date;
  minDate?: Date;
  placeholderText?: string;
  className?: string;
}

// Custom Input Component
const CustomInput = forwardRef<HTMLButtonElement, any>(
  ({ value, onClick, placeholder }, ref) => (
    <button
      type="button"
      onClick={onClick}
      ref={ref}
      className="w-full px-4 py-3 bg-background-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-white transition-all text-left flex items-center justify-between text-text-primary gap-3"
    >
      <span className={value ? 'text-white' : 'text-text-secondary'}>
        {value || placeholder}
      </span>
      <Calendar className="w-5 h-5 text-white flex-shrink-0" />
    </button>
  )
);

CustomInput.displayName = 'CustomInput';

export default function CustomDatePicker({
  selected,
  onChange,
  maxDate,
  minDate,
  placeholderText = 'Datum auswählen',
  className = '',
}: CustomDatePickerProps) {
  return (
    <div className={className}>
      <DatePicker
        selected={selected}
        onChange={onChange}
        maxDate={maxDate}
        minDate={minDate}
        dateFormat="dd.MM.yyyy"
        customInput={<CustomInput />}
        calendarClassName="custom-datepicker"
        showPopperArrow={false}
        popperClassName="custom-datepicker-popper"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        yearDropdownItemNumber={100}
        scrollableYearDropdown
        popperPlacement="bottom-start"
      />
      <style jsx global>{`
        /* Wrapper auf volle Breite */
        .react-datepicker-wrapper {
          width: 100% !important;
          display: block !important;
        }

        .react-datepicker__input-container {
          width: 100% !important;
          display: block !important;
        }

        /* Dark Theme für DatePicker */
        .custom-datepicker {
          background-color: #1a1a1a !important;
          border: 1px solid #333 !important;
          border-radius: 12px !important;
          font-family: inherit !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        }

        .custom-datepicker-popper {
          z-index: 9999 !important;
        }

        /* Mobile Optimierung */
        @media (max-width: 640px) {
          .custom-datepicker-popper {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: 90vw !important;
          }

          .custom-datepicker {
            max-width: 320px !important;
            margin: 0 auto !important;
          }
        }

        .react-datepicker__header {
          background-color: #2a2a2a !important;
          border-bottom: 1px solid #333 !important;
          border-radius: 12px 12px 0 0 !important;
          padding-top: 12px !important;
        }

        .react-datepicker__current-month {
          color: white !important;
          font-weight: 600 !important;
          font-size: 14px !important;
          margin-bottom: 8px !important;
        }

        .react-datepicker__month-dropdown-container,
        .react-datepicker__year-dropdown-container {
          margin: 0 4px !important;
        }

        .react-datepicker__month-select,
        .react-datepicker__year-select {
          background-color: #2a2a2a !important;
          color: white !important;
          border: 1px solid #444 !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          outline: none !important;
        }

        .react-datepicker__month-select:hover,
        .react-datepicker__year-select:hover {
          background-color: #3a3a3a !important;
          border-color: #666 !important;
        }

        .react-datepicker__month-select:focus,
        .react-datepicker__year-select:focus {
          border-color: white !important;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1) !important;
        }

        .react-datepicker__month-select option,
        .react-datepicker__year-select option {
          background-color: #1a1a1a !important;
          color: white !important;
          padding: 8px !important;
        }

        .react-datepicker__month-select option:hover,
        .react-datepicker__year-select option:hover {
          background-color: #3a3a3a !important;
        }

        .react-datepicker__day-names {
          padding: 8px 0 !important;
        }

        .react-datepicker__day-name {
          color: #888 !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          width: 36px !important;
          line-height: 36px !important;
        }

        .react-datepicker__month {
          margin: 8px !important;
        }

        .react-datepicker__day {
          color: white !important;
          width: 36px !important;
          line-height: 36px !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          margin: 2px !important;
        }

        .react-datepicker__day:hover {
          background-color: #3a3a3a !important;
          border-radius: 8px !important;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: white !important;
          color: black !important;
          font-weight: 700 !important;
          border-radius: 8px !important;
        }

        .react-datepicker__day--selected:hover {
          background-color: #e0e0e0 !important;
        }

        .react-datepicker__day--today {
          background-color: #2a2a2a !important;
          border: 1px solid #555 !important;
          font-weight: 600 !important;
          border-radius: 8px !important;
        }

        .react-datepicker__day--disabled {
          color: #444 !important;
          cursor: not-allowed !important;
        }

        .react-datepicker__day--disabled:hover {
          background-color: transparent !important;
        }

        .react-datepicker__day--outside-month {
          color: #555 !important;
        }

        .react-datepicker__navigation {
          top: 12px !important;
        }

        .react-datepicker__navigation-icon::before {
          border-color: white !important;
        }

        .react-datepicker__navigation:hover *::before {
          border-color: #ccc !important;
        }

        .react-datepicker__triangle {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
