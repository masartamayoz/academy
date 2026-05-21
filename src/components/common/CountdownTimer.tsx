import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface CountdownTimerProps {
  expiryDate: string;
  className?: string;
  showTitle?: boolean;
}

export default function CountdownTimer({ expiryDate, className, showTitle = true }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(expiryDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryDate]);

  if (!timeLeft) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-4 rounded-2xl bg-red-50 text-red-600 border border-red-100", className)}>
        <p className="text-xs font-black">انتهى العمال / العرض</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showTitle && <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-widest text-right">الوقت المتبقي لانتهاء العرض</p>}
      <div className="flex gap-2" dir="ltr">
        {[
          { label: 'يوم', value: timeLeft.days },
          { label: 'ساعة', value: timeLeft.hours },
          { label: 'دقيقة', value: timeLeft.minutes },
          { label: 'ثانية', value: timeLeft.seconds }
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center bg-white/50 backdrop-blur-sm border border-gray-100 rounded-xl px-2 py-1 min-w-[50px] shadow-sm">
            <span className="text-lg font-black text-blue-dark leading-none">{item.value.toString().padStart(2, '0')}</span>
            <span className="text-[0.55rem] font-bold text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
