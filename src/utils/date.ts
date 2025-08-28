import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs to support relative time functionality
dayjs.extend(relativeTime);

/**
 * Format time to "MM/DD/YYYY HH:mm" format
 * @param date Date object or date string
 * @returns Formatted time string
 */
export const formatTime = (date: Date | string): string => {
  return dayjs(date).format('MM/DD/YYYY HH:mm');
};

/**
 * Format time to relative time (e.g., just now, 5 minutes ago, 1 hour ago, etc.)
 * @param date Date object or date string
 * @returns Relative time string
 */
export const formatRelativeTime = (date: Date | string): string => {
  return dayjs(date).fromNow();
};

/**
 * Format time to short format (e.g., Today HH:mm, Yesterday HH:mm, MM/DD HH:mm)
 * @param date Date object or date string
 * @returns Short format time string
 */
export const formatShortTime = (date: Date | string): string => {
  const now = dayjs();
  const targetDate = dayjs(date);
  
  if (targetDate.isSame(now, 'day')) {
    return `Today ${targetDate.format('HH:mm')}`;
  } else if (targetDate.isSame(now.subtract(1, 'day'), 'day')) {
    return `Yesterday ${targetDate.format('HH:mm')}`;
  } else if (targetDate.isSame(now, 'year')) {
    return targetDate.format('MM/DD HH:mm');
  } else {
    return targetDate.format('YYYY/MM/DD HH:mm');
  }
}; 