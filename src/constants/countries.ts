export interface Country {
  code: string;
  name: string;
  nameAr: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  sampleLength: number;
}

export const DEFAULT_COUNTRY: Country = {
  code: 'TN',
  name: 'Tunisia',
  nameAr: 'تونس',
  dialCode: '+216',
  flag: '🇹🇳',
  placeholder: '20 123 456',
  sampleLength: 8,
};

export const COUNTRIES: Country[] = [
  DEFAULT_COUNTRY,
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', dialCode: '+213', flag: '🇩🇿', placeholder: '555 12 34 56', sampleLength: 9 },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', dialCode: '+212', flag: '🇲🇦', placeholder: '612 345 678', sampleLength: 9 },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', dialCode: '+218', flag: '🇱🇾', placeholder: '91 234 5678', sampleLength: 9 },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', dialCode: '+20', flag: '🇪🇬', placeholder: '10 1234 5678', sampleLength: 10 },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', dialCode: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78', sampleLength: 9 },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', dialCode: '+966', flag: '🇸🇦', placeholder: '50 123 4567', sampleLength: 9 },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', dialCode: '+971', flag: '🇦🇪', placeholder: '50 123 4567', sampleLength: 9 },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', dialCode: '+974', flag: '🇶🇦', placeholder: '3312 3456', sampleLength: 8 },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', dialCode: '+965', flag: '🇰🇼', placeholder: '5123 4567', sampleLength: 8 },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', dialCode: '+968', flag: '🇴🇲', placeholder: '9123 4567', sampleLength: 8 },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', dialCode: '+973', flag: '🇧🇭', placeholder: '3600 1234', sampleLength: 8 },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', dialCode: '+962', flag: '🇯🇴', placeholder: '7 9012 3456', sampleLength: 9 },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', flag: '🇱🇧', placeholder: '70 123 456', sampleLength: 8 },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', dialCode: '+964', flag: '🇮🇶', placeholder: '770 123 4567', sampleLength: 10 },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', dialCode: '+970', flag: '🇵🇸', placeholder: '59 123 4567', sampleLength: 9 },
  { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا', dialCode: '+222', flag: '🇲🇷', placeholder: '46 12 34 56', sampleLength: 8 },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', dialCode: '+249', flag: '🇸🇩', placeholder: '91 234 5678', sampleLength: 9 },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', dialCode: '+967', flag: '🇾🇪', placeholder: '71 234 5678', sampleLength: 9 },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', dialCode: '+963', flag: '🇸🇾', placeholder: '933 123 456', sampleLength: 9 },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', dialCode: '+49', flag: '🇩🇪', placeholder: '151 23456789', sampleLength: 10 },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', dialCode: '+39', flag: '🇮🇹', placeholder: '312 345 6789', sampleLength: 10 },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', dialCode: '+34', flag: '🇪🇸', placeholder: '612 34 56 78', sampleLength: 9 },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', flag: '🇬🇧', placeholder: '7911 123456', sampleLength: 10 },
  { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا', dialCode: '+32', flag: '🇧🇪', placeholder: '470 12 34 56', sampleLength: 9 },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', dialCode: '+41', flag: '🇨🇭', placeholder: '78 123 45 67', sampleLength: 9 },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', dialCode: '+1', flag: '🇨🇦', placeholder: '416 123 4567', sampleLength: 10 },
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', dialCode: '+1', flag: '🇺🇸', placeholder: '202 555 0123', sampleLength: 10 },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', dialCode: '+90', flag: '🇹🇷', placeholder: '501 234 5678', sampleLength: 10 },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678', sampleLength: 9 },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد', dialCode: '+46', flag: '🇸🇪', placeholder: '70 123 45 67', sampleLength: 9 },
  { code: 'NO', name: 'Norway', nameAr: 'النرويج', dialCode: '+47', flag: '🇳🇴', placeholder: '412 34 567', sampleLength: 8 },
  { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك', dialCode: '+45', flag: '🇩🇰', placeholder: '20 12 34 56', sampleLength: 8 },
  { code: 'AT', name: 'Austria', nameAr: 'النمسا', dialCode: '+43', flag: '🇦🇹', placeholder: '660 1234567', sampleLength: 10 },
  { code: 'SN', name: 'Senegal', nameAr: 'السنغال', dialCode: '+221', flag: '🇸🇳', placeholder: '77 123 45 67', sampleLength: 9 },
  { code: 'CI', name: 'Ivory Coast', nameAr: 'ساحل العاج', dialCode: '+225', flag: '🇨🇮', placeholder: '07 12 34 56 78', sampleLength: 10 },
];
