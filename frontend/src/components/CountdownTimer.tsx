"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface CountdownTimerProps {
  lockEnd: bigint | number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(lockEnd: number): TimeRemaining {
  const now = Math.floor(Date.now() / 1000);
  const total = Math.max(0, lockEnd - now);

  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    total,
  };
}

export function CountdownTimer({ lockEnd, showIcon = true, size = "md" }: CountdownTimerProps) {
  const [time, setTime] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(Number(lockEnd))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(calculateTimeRemaining(Number(lockEnd)));
    }, 1000);

    return () => clearInterval(interval);
  }, [lockEnd]);

  const isExpired = time.total === 0;
  const isCritical = time.days === 0 && time.hours < 24;
  const isWarning = time.days > 0 && time.days < 7;
  const isHealthy = time.days >= 7;

  const getColorClass = () => {
    if (isExpired) return "text-mezo-danger";
    if (isCritical) return "text-mezo-danger";
    if (isWarning) return "text-mezo-warning";
    return "text-mezo-success";
  };

  const getBgClass = () => {
    if (isExpired) return "bg-mezo-danger/10 border-mezo-danger/30";
    if (isCritical) return "bg-mezo-danger/10 border-mezo-danger/30";
    if (isWarning) return "bg-mezo-warning/10 border-mezo-warning/30";
    return "bg-mezo-success/10 border-mezo-success/30";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const formatTime = () => {
    if (isExpired) return "Expired";

    if (time.days > 0) {
      return `${time.days}d ${time.hours}h`;
    }
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m`;
    }
    return `${time.minutes}m ${time.seconds}s`;
  };

  const Icon = isExpired ? AlertTriangle : isCritical ? AlertTriangle : Clock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 rounded-xl border font-medium tabular-nums
        ${getBgClass()} ${sizeClasses[size]}`}
    >
      {showIcon && (
        <Icon
          className={`${iconSizes[size]} ${getColorClass()} ${
            isCritical && !isExpired ? "animate-pulse" : ""
          }`}
        />
      )}
      <span className={getColorClass()}>{formatTime()}</span>
    </motion.div>
  );
}

// Compact version for cards
export function CountdownCompact({ lockEnd }: { lockEnd: bigint | number }) {
  const [time, setTime] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(Number(lockEnd))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(calculateTimeRemaining(Number(lockEnd)));
    }, 1000);

    return () => clearInterval(interval);
  }, [lockEnd]);

  const isExpired = time.total === 0;
  const isCritical = time.days === 0;
  const isWarning = time.days > 0 && time.days < 7;

  const getColorClass = () => {
    if (isExpired) return "text-mezo-danger";
    if (isCritical) return "text-mezo-danger";
    if (isWarning) return "text-mezo-warning";
    return "text-mezo-success";
  };

  const formatTime = () => {
    if (isExpired) return "Expired";
    if (time.days > 0) return `${time.days}d ${time.hours}h`;
    if (time.hours > 0) return `${time.hours}h ${time.minutes}m`;
    return `${time.minutes}m`;
  };

  return (
    <span className={`font-medium tabular-nums ${getColorClass()}`}>{formatTime()}</span>
  );
}
