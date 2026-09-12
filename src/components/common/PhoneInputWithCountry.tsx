import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Mail } from 'lucide-react';
import { Country, COUNTRIES, DEFAULT_COUNTRY } from '@/src/constants/countries';
import { cn } from '@/src/lib/utils';

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (nationalNumber: string, fullInternationalNumber: string, country: Country) => void;
  selectedCountry?: Country;
  onCountryChange?: (country: Country) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  allowEmail?: boolean;
}

export default function PhoneInputWithCountry({
  value,
  onChange,
  selectedCountry = DEFAULT_COUNTRY,
  onCountryChange,
  placeholder,
  required = false,
  disabled = false,
  id = 'phone-input',
  className,
  allowEmail = false
}: PhoneInputWithCountryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isEmailMode = Boolean(allowEmail && (value.includes('@') || /[a-zA-Z]/.test(value)));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter countries based on search query
  const filteredCountries = COUNTRIES.filter(c => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const cleanDial = c.dialCode.replace('+', '');
    const searchNoPlus = q.replace('+', '');
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      cleanDial.startsWith(searchNoPlus)
    );
  });

  const handleSelectCountry = (country: Country) => {
    if (onCountryChange) {
      onCountryChange(country);
    }
    setIsOpen(false);
    setSearchQuery('');

    // Recompute full international number with new country
    if (allowEmail && (value.includes('@') || /[a-zA-Z]/.test(value))) {
      onChange(value, value, country);
    } else {
      const rawNumber = value.replace(/[^\d]/g, '');
      const fullNumber = rawNumber ? `${country.dialCode}${rawNumber}` : '';
      onChange(value, fullNumber, country);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;

    if (allowEmail) {
      // Check if user is typing an email (contains letters or @)
      const hasEmailChars = inputVal.includes('@') || /[a-zA-Z]/.test(inputVal);
      if (hasEmailChars) {
        onChange(inputVal, inputVal, selectedCountry);
        return;
      }
    }

    // Check if user pasted a full international number like +33612345678 or +21620123456
    if (inputVal.startsWith('+') || inputVal.startsWith('00')) {
      const cleaned = inputVal.replace(/^00/, '+');
      // Find matching country
      const matchedCountry = COUNTRIES.find(c => cleaned.startsWith(c.dialCode));
      if (matchedCountry) {
        if (onCountryChange) {
          onCountryChange(matchedCountry);
        }
        const nationalPart = cleaned.slice(matchedCountry.dialCode.length).trim();
        const fullNumber = `${matchedCountry.dialCode}${nationalPart.replace(/[^\d]/g, '')}`;
        onChange(nationalPart, fullNumber, matchedCountry);
        return;
      }
    }

    // Numbers handling
    const cleanDigits = inputVal.replace(/[^\d\s]/g, '');
    const rawDigits = cleanDigits.replace(/\s+/g, '');
    const fullNumber = rawDigits ? `${selectedCountry.dialCode}${rawDigits}` : '';
    onChange(cleanDigits, fullNumber, selectedCountry);
  };

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef} dir="ltr">
      <div 
        className={cn(
          "flex items-center w-full rounded-xl border-1.5 bg-gray-50 transition-all text-[0.9rem]",
          isOpen ? "border-blue-light bg-white ring-4 ring-blue-500/10" : "border-gray-200 focus-within:border-blue-light focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {/* Country Selector / Credential Type Button on the left */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2.5 text-gray-800 hover:bg-gray-100/70 transition-colors rounded-l-xl shrink-0 select-none outline-none focus:outline-none"
          title={isEmailMode ? "بريد إلكتروني (اضغط لاختيار دولة ورقم هاتف)" : `${selectedCountry.nameAr} (${selectedCountry.name}) ${selectedCountry.dialCode}`}
        >
          {isEmailMode ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-blue-dark">
              <Mail size={16} className="text-blue-light" />
              <span className="hidden sm:inline">بريد إلكتروني</span>
            </span>
          ) : (
            <>
              <span className="text-lg leading-none" role="img" aria-label={selectedCountry.name}>
                {selectedCountry.flag}
              </span>
              <span className="font-medium text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                {selectedCountry.name} <span className="font-semibold text-blue-dark inline-block" dir="ltr">({selectedCountry.dialCode})</span>
              </span>
            </>
          )}
          <ChevronDown size={14} className={cn("text-gray-400 transition-transform duration-200", isOpen && "rotate-180 text-blue-light")} />
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-gray-300/80 shrink-0 mx-0.5" />

        {/* Input Field on the right, typed and read from left to right */}
        <input
          id={id}
          type={isEmailMode ? "email" : "text"}
          value={value}
          onChange={handleNumberChange}
          placeholder={placeholder || (allowEmail ? '20 123 456 أو example@gmail.com' : selectedCountry.placeholder)}
          required={required}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          dir="ltr"
          className="w-full bg-transparent px-3 py-2.5 text-[0.9rem] font-medium outline-none text-left font-sans placeholder:text-gray-400 placeholder:text-left rounded-r-xl"
        />
      </div>

      {/* Countries Dropdown aligned to the left */}
      {isOpen && (
        <div 
          className="absolute z-50 top-full mt-1.5 left-0 w-72 sm:w-80 max-h-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150 text-right"
          dir="rtl"
        >
          {/* Search Header */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/70 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search size={16} className="absolute right-2.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث عن الدولة أو الرمز الدولي..."
                className="w-full bg-white rounded-xl border border-gray-200 py-1.5 pr-8 pl-3 text-xs outline-none focus:border-blue-light focus:ring-2 focus:ring-blue-100 text-right"
              />
            </div>
          </div>

          {/* List of Countries */}
          <div className="overflow-y-auto divide-y divide-gray-50 max-h-60 p-1">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                لم يتم العثور على دولة مطابقة
              </div>
            ) : (
              filteredCountries.map(country => {
                const isSelected = country.code === selectedCountry.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelectCountry(country)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-right",
                      isSelected ? "bg-blue-light/10 text-blue-light font-bold" : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{country.flag}</span>
                      <span className="font-medium text-gray-800">{country.nameAr}</span>
                      <span className="text-[0.7rem] text-gray-400">({country.name})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-600 text-[0.78rem]" dir="ltr">
                        {country.dialCode}
                      </span>
                      {isSelected && <Check size={14} className="text-blue-light" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
