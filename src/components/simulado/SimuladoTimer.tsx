import { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimuladoTimerProps {
  className?: string;
  onTimeUpdate?: (seconds: number) => void;
  initialTime?: number;
  isPaused?: boolean;
}

export const SimuladoTimer = ({ 
  className, 
  onTimeUpdate, 
  initialTime = 0,
  isPaused = false 
}: SimuladoTimerProps) => {
  const [timeElapsed, setTimeElapsed] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(!isPaused);
  
  // Use refs to track time accurately even when tab loses focus
  const startTimeRef = useRef<number>(Date.now() - initialTime * 1000);
  const lastUpdateRef = useRef<number>(initialTime);
  const animationFrameRef = useRef<number>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Persist time to localStorage to survive page reloads
  const storageKey = 'simulado_timer_state';
  
  // Update timer using timestamps (more accurate than interval counting)
  const updateTimer = useCallback(() => {
    if (!isRunning) return;
    
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000);
    
    if (elapsedSeconds !== lastUpdateRef.current) {
      lastUpdateRef.current = elapsedSeconds;
      setTimeElapsed(elapsedSeconds);
      onTimeUpdate?.(elapsedSeconds);
      
      // Save to localStorage periodically (every 10 seconds)
      if (elapsedSeconds % 10 === 0) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            startTime: startTimeRef.current,
            lastElapsed: elapsedSeconds,
            timestamp: currentTime
          }));
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }
  }, [isRunning, onTimeUpdate]);

  // Handle visibility changes - recalculate time when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        // Recalculate elapsed time based on actual timestamps
        updateTimer();
      }
    };

    // Handle window focus
    const handleFocus = () => {
      if (isRunning) {
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isRunning, updateTimer]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Use interval for regular updates, but rely on timestamps for accuracy
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, updateTimer]);

  // Initialize from props
  useEffect(() => {
    startTimeRef.current = Date.now() - initialTime * 1000;
    lastUpdateRef.current = initialTime;
    setTimeElapsed(initialTime);
  }, [initialTime]);

  // Update running state from props
  useEffect(() => {
    setIsRunning(!isPaused);
  }, [isPaused]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeElapsed < 1800) return 'text-emerald-500'; // < 30 min - green
    if (timeElapsed < 3600) return 'text-primary'; // < 1 hour - primary
    if (timeElapsed < 5400) return 'text-amber-500'; // < 1.5 hours - amber
    return 'text-destructive'; // > 1.5 hours - red
  };

  const getGlowColor = () => {
    if (timeElapsed < 1800) return 'shadow-emerald-500/30';
    if (timeElapsed < 3600) return 'shadow-primary/30';
    if (timeElapsed < 5400) return 'shadow-amber-500/30';
    return 'shadow-destructive/30';
  };

  const getBorderColor = () => {
    if (timeElapsed < 1800) return 'border-emerald-500/30';
    if (timeElapsed < 3600) return 'border-primary/30';
    if (timeElapsed < 5400) return 'border-amber-500/30';
    return 'border-destructive/30';
  };

  const getBgColor = () => {
    if (timeElapsed < 1800) return 'from-emerald-500/10 to-emerald-500/5';
    if (timeElapsed < 3600) return 'from-primary/10 to-primary/5';
    if (timeElapsed < 5400) return 'from-amber-500/10 to-amber-500/5';
    return 'from-destructive/10 to-destructive/5';
  };

  return (
    <div 
      className={cn(
        'relative group',
        className
      )}
    >
      {/* Glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-xl blur-xl opacity-50 transition-all duration-500',
        getGlowColor()
      )} />
      
      {/* Timer container */}
      <div className={cn(
        'relative flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300',
        'bg-gradient-to-br backdrop-blur-sm',
        getBorderColor(),
        getBgColor(),
        'hover:scale-105'
      )}>
        {/* Animated clock icon */}
        <div className={cn(
          'relative p-2 rounded-lg transition-all duration-300',
          'bg-background/50 border',
          getBorderColor()
        )}>
          <Timer className={cn(
            'h-5 w-5 transition-colors duration-300',
            getTimeColor()
          )} />
          
          {/* Pulse ring */}
          <div className={cn(
            'absolute inset-0 rounded-lg animate-ping opacity-30',
            timeElapsed > 3600 ? 'bg-destructive' : 'bg-primary'
          )} style={{ animationDuration: '2s' }} />
        </div>

        {/* Time display */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Tempo
          </span>
          <span className={cn(
            'text-lg font-mono font-bold tabular-nums tracking-tight transition-colors duration-300',
            getTimeColor()
          )}>
            {formatTime(timeElapsed)}
          </span>
        </div>

        {/* Progress indicator */}
        <div className="flex flex-col gap-1 ml-1">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i}
              className={cn(
                'h-1 w-1 rounded-full transition-all duration-300',
                (timeElapsed / 1800) > i 
                  ? i < 2 
                    ? 'bg-emerald-500' 
                    : i < 3 
                    ? 'bg-amber-500' 
                    : 'bg-destructive'
                  : 'bg-muted-foreground/30'
              )}
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
