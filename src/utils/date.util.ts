import dayjs from 'dayjs';

/**
 * Checks if a candidate date is yesterday
 */
export const isYesterday = (currentDate: dayjs.Dayjs, candidateDate: Date) => {
	const yesterday = currentDate.subtract(1, 'day').startOf('day');
	return dayjs(candidateDate).isSame(yesterday, 'day');
};

/**
 * Checks if a candidate date is before yesterday
 */
export const isBeforeYesterday = (currentDate: dayjs.Dayjs, candidateDate: Date) => {
	const yesterdayStart = currentDate.subtract(1, 'day').startOf('day');
	return dayjs(candidateDate).isBefore(yesterdayStart);
};

/**
 * Checks if the dates are the same day
 */
export const isSameDay = (currentDate: dayjs.Dayjs, candidateDate: Date) => {
	return currentDate.isSame(dayjs(candidateDate), 'day');
};
