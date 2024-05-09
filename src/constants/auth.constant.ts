import { CookieOptions } from 'hono/utils/cookie';

export enum AUTH_COOKIE_KEYS {
	ACCESS_TOKEN = 'music-lab.x-access-token',
	REFRESH_TOKEN = 'music-lab.x-refresh-token',
	X_CSRF_TOKEN = 'music-lab.x-csrf-token',
}

const domain = process.env.COOKIE_DOMAIN;

export const AUTH_COOKIE_OPTIONS: Record<keyof typeof AUTH_COOKIE_KEYS, CookieOptions> = {
	ACCESS_TOKEN: {
		path: '/',
		secure: true,
		httpOnly: true,
		maxAge: 15 * 60,
		sameSite: 'None',
		partitioned: true,
		domain,
	},
	REFRESH_TOKEN: {
		path: '/',
		secure: true,
		httpOnly: true,
		maxAge: 30 * 24 * 60 * 60,
		sameSite: 'None',
		partitioned: true,
		domain,
	},
	X_CSRF_TOKEN: {
		path: '/',
		secure: true,
		httpOnly: true,
		maxAge: 15 * 60,
		sameSite: 'None',
		partitioned: true,
		domain,
	},
};

export enum AUTH_HEADER_KEYS {
	ACCESS_TOKEN = 'Music-Lab-X-Access-Token',
	REFRESH_TOKEN = 'Music-Lab-X-Refresh-Token',
	X_CSRF_TOKEN = 'Music-Lab-X-Csrf-Token',
}
