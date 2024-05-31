import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import fs from 'fs';
import { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import path from 'path';

import { AUTH_COOKIE_KEYS, AUTH_COOKIE_OPTIONS } from '@/constants/auth.constant';
import { IAuthenticatorContextPayload } from '@/types/api.type';

type JwtType = 'common' | 'access_token' | 'refresh_token';
const TOKEN_ISSUER = 'music-lab-api';
const TOKEN_AUDIENCE = ['music-lab-web', 'music-lab-pwa'];

const tokenExpiries: Record<JwtType, number> = {
	access_token: dayjs().add(30, 'days').unix(),
	refresh_token: dayjs().add(30, 'days').unix(),
	common: dayjs().add(15, 'minutes').unix(),
};

const { PRIVATE_KEY_PATH, PUBLIC_KEY_PATH } = process.env;
let privateKey: Buffer | undefined;
let publicKey: Buffer | undefined;
if (!privateKey && !publicKey) {
	try {
		publicKey = fs.readFileSync(path.resolve(process.cwd() ?? process.env.LAMBDA_TASK_ROOT, PUBLIC_KEY_PATH as string));
		privateKey = fs.readFileSync(path.resolve(process.cwd() ?? process.env.LAMBDA_TASK_ROOT, PRIVATE_KEY_PATH as string));
	} catch (error) {
		console.info('Error: Could not read private and public keys');
	}
}

export interface AuthToken<TPayload> {
	sub: string;
	iss: string;
	aud: string | string[];
	iat: number;
	exp: number;
	payload: TPayload;
}

export class AuthService {
	private constructor() {}

	public static generateToken<TPayload = IAuthenticatorContextPayload>(sub: string, payload: TPayload, opts: { jwtType: JwtType; exp?: number | null }): string {
		if (!privateKey) {
			throw new Error('Error: Could not generate token (no public key).');
		}

		const token: AuthToken<TPayload> = {
			sub,
			iss: TOKEN_ISSUER,
			aud: TOKEN_AUDIENCE,
			iat: dayjs().unix(),
			exp: opts.exp ?? tokenExpiries[opts.jwtType] ?? dayjs().add(1, 'day').unix(),
			payload: payload,
		};

		return jwt.sign(token, privateKey, { algorithm: 'RS256' });
	}

	public static extractToken<TPayload = IAuthenticatorContextPayload>(
		rawToken: string
	): { valid: boolean; expired: boolean; decoded: AuthToken<TPayload> } | { valid: false; expired: boolean; decoded: null } {
		if (!publicKey) {
			throw new Error('Error: Could not extract token (no public key).');
		}

		try {
			const decodedToken = jwt.decode(rawToken, { complete: true });
			const verifiedToken = jwt.verify(rawToken, publicKey) as AuthToken<TPayload>;

			if (!decodedToken || decodedToken.header.alg !== 'RS256' || verifiedToken.iss !== TOKEN_ISSUER)
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
	}
}

export class AuthCredentialsService {
	private constructor() {}

	public static setCredentials(c: Context, accessToken: string, refreshToken: string) {
		setCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN, accessToken, AUTH_COOKIE_OPTIONS.ACCESS_TOKEN);
		setCookie(c, AUTH_COOKIE_KEYS.REFRESH_TOKEN, refreshToken, AUTH_COOKIE_OPTIONS.REFRESH_TOKEN);
	}

	public static deleteCredentials(c: Context) {
		deleteCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN);
		deleteCookie(c, AUTH_COOKIE_KEYS.REFRESH_TOKEN);
	}
}

export class HashService {
	private constructor() {}

	public static async hash(str: string, saltRounds?: number | undefined): Promise<string> {
		const salt = await bcrypt.genSalt(saltRounds ?? 10);
		return await bcrypt.hash(str, salt);
	}

	public static async compareHash(candidate: string, hash: string): Promise<boolean> {
		return await bcrypt.compare(candidate, hash);
	}
}
