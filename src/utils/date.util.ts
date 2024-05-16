import dayjs from 'dayjs';

export const isYesterday = (currentDate: dayjs.Dayjs, candidateDate: Date) => {
	const yesterday = currentDate.subtract(1, 'day').startOf('day');
	return dayjs(candidateDate).isSame(yesterday, 'day');
};

export const isBeforeYesterday = (currentDate: dayjs.Dayjs, candidateDate: Date) => {
	const yesterdayStart = currentDate.subtract(1, 'day').startOf('day');
	return dayjs(candidateDate).isBefore(yesterdayStart);
};

export const isSameDay = (currentDate: dayjs.Dayjs, candidateDate: Date) => {
	return currentDate.isSame(dayjs(candidateDate), 'day');
};
