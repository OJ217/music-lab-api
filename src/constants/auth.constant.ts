import { CookieOptions } from 'hono/utils/cookie';

export enum AUTH_COOKIE_KEYS {
	ACCESS_TOKEN = 'music-lab.x-access-token',
	REFRESH_TOKEN = 'music-lab.x-refresh-token',
	X_CSRF_TOKEN = 'music-lab.x-csrf-token',
}

export enum AUTH_HEADER_KEYS {
	ACCESS_TOKEN = 'Music-Lab-X-Access-Token',
	REFRESH_TOKEN = 'Music-Lab-X-Refresh-Token',
	X_CSRF_TOKEN = 'Music-Lab-X-Csrf-Token',
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

export const ADMIN_EMAILS = ['dev-admin@music-lab.io', 'tsenguunnyz@gmail.com', 'ochiroo032373@gmail.com'];
export const USER_EMAILS = [
	'erikamargad0429@gmail.com',
	'myon2745@gmail.com',
	'nominjin0001@gmail.com',
	'munguuoyuk@gmail.com',
	'goomaralerdenebaatar24@gmail.com',
	'maraldulgain@gmail.com',
	'abuyankhishig8@gmail.com',
	'anhil.tulga23@gmail.com',
	'erdenebilegtselmuun@gmail.com',
	'Ganbatnomin884@gmail.com',
	'ganbatnomin884@gmail.com',
	'nomkaenkh@gmail.com',
	'egshig595@gmail.com',
	'tsogoogunbilig@gmail.com',
	'Namona1026@gmail.com',
	'namona1026@gmail.com',
	'agaa.enerel@gmail.com',
	'Sunjidmaaganzorig0218@gmail.com',
	'sunjidmaaganzorig0218@gmail.com',
	'egshiglen0916@gmail.com',
	'anargooamartuvshin@gmail.com ',
	'orshiho801@gmail.com',
	'tselmegbold2@gmail.com',
	'a.ganchimeg432@gmail.com',
	'herlendashtseren@gmail.com',
	'Fairyvea@gmail.com',
	'fairyvea@gmail.com',
	'sondor20057777@gmail.com',
	'ganbayr94208421@gmail.com',
	'cactusmino@gmail.com',
	'Tserentogtokhtelmas@gmail.com',
	'tserentogtokhtelmas@gmail.com',
	'shikhi.g.muk.edu2020@gmail.com',
	'gantogtohg201@gmail.com',
	'tserenbattengis4@gmail.com',
	'agvaandorj1234@gmail.com',
	'amartuvshin343@gmail.com',
];
export const AUTHORIZED_EMAILS = [...ADMIN_EMAILS, ...USER_EMAILS];
