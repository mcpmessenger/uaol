import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface CreditBalanceProps {
  className?: string;
  showIcon?: boolean;
  showWarning?: boolean;
}

export function CreditBalance({ className, showIcon = true, showWarning = true }: CreditBalanceProps) {
  const [credits, setCredits] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCredits = async () => {
    try {
      const response = await apiClient.getCredits();
      if (response.success && response.data) {
        setCredits(response.data.credits);
      } else {
        setCredits('0');
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      setCredits('0');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();

    // Poll for credit updates every 30 seconds
    const interval = setInterval(fetchCredits, 30000);

    // Also listen for credit updates from other parts of the app
    const handleCreditUpdate = () => {
      fetchCredits();
    };

    window.addEventListener('credits-updated', handleCreditUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('credits-updated', handleCreditUpdate);
    };
  }, []);

  const creditNumber = credits ? BigInt(credits) : BigInt(0);
  const isLow = showWarning && creditNumber < BigInt(100);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {showIcon && <Coins className="h-4 w-4 animate-pulse" />}
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && <Coins className={cn('h-4 w-4', isLow && 'text-yellow-500')} />}
      <span className={cn('text-sm font-medium', isLow && 'text-yellow-500')}>
        {creditNumber.toLocaleString()} credits
      </span>
      {isLow && (
        <span className="text-xs text-yellow-500" title="Low credit balance">
          ⚠️
        </span>
      )}
    </div>
  );
}

