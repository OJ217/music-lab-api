import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';

import { AuthenticatorContextPayload } from '@/types';

type JwtType = 'common' | 'access_token' | 'refresh_token';
const TOKEN_ISSUER = 'music-lab-api';
const TOKEN_AUDIENCE = ['music-lab-web', 'music-lab-pwa'];

const JWT_SECRETS: Record<JwtType, string> = {
	access_token: process.env.ACCESS_TOKEN_JWT_SECRET ?? '',
	refresh_token: process.env.REFRESH_TOKEN_JWT_SECRET ?? '',
	common: process.env.COMMON_JWT_SECRET ?? '',
};

const tokenExpiries: Record<JwtType, number> = {
	access_token: dayjs().add(1, 'day').unix(),
	refresh_token: dayjs().add(30, 'days').unix(),
	common: dayjs().add(15, 'minutes').unix(),
};

export interface AuthToken<TPayload> {
	sub: string;
	iss: string;
	aud: string | string[];
	iat: number;
	exp: number;
	payload: TPayload;
}

export const generateToken = <TPayload = AuthenticatorContextPayload>(sub: string, payload: TPayload, opts: { jwtType: JwtType; exp?: number | null }): string => {
	const token: AuthToken<TPayload> = {
		sub,
		iss: TOKEN_ISSUER,
		aud: TOKEN_AUDIENCE,
		iat: dayjs().unix(),
		exp: opts.exp ?? tokenExpiries[opts.jwtType] ?? dayjs().add(1, 'day').unix(),
		payload: payload,
	};

	return jwt.sign(token, JWT_SECRETS[opts.jwtType]);
};

export const extractToken = <TPayload = AuthenticatorContextPayload>(
	rawToken: string,
	secret: JwtType
): { valid: boolean; expired: boolean; decoded: AuthToken<TPayload> } | { valid: false; expired: boolean; decoded: null } => {
	try {
		const verifiedToken = jwt.verify(rawToken, JWT_SECRETS[secret]) as AuthToken<TPayload>;

		if (verifiedToken.iss !== TOKEN_ISSUER)
			return {
				valid: false,
				expired: false,
				decoded: null,
			};

		return {
			valid: true,
			expired: false,
			decoded: verifiedToken,
		};
	} catch (error: any) {
		return {
			valid: false,
			expired: error.message === 'jwt expired',
			decoded: null,
		};
	}
};
