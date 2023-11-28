import { Context } from 'hono';
import { setCookie } from 'hono/cookie';

import { AUTH_COOKIE_KEYS, AUTH_COOKIE_OPTIONS, AUTH_HEADER_KEYS } from '@/config/auth.config';
import { AuthenticatorContextPayload } from '@/types';
import { generateToken } from '@/util/auth.util';

import { UserDocument } from '../user/user.model';

type SetAuthCredentials = (c: Context, user: UserDocument) => void;
export const setAuthCredentials: SetAuthCredentials = (c, user) => {
	const userId = user._id.toString();
	const authTokenPayload: AuthenticatorContextPayload = { id: userId, email: user.email };

	const accessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
	const refreshToken = generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

	setCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN, accessToken, AUTH_COOKIE_OPTIONS.ACCESS_TOKEN);
	setCookie(c, AUTH_COOKIE_KEYS.REFRESH_TOKEN, refreshToken, AUTH_COOKIE_OPTIONS.REFRESH_TOKEN);
};

type SetAuthHeaders = (c: Context, user: UserDocument) => void;
export const setAuthHeaders: SetAuthHeaders = (c, user) => {
	const userId = user._id.toString();
	const authTokenPayload: AuthenticatorContextPayload = { id: userId, email: user.email };

	const accessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
	const refreshToken = generateToken(userId, authTokenPayload, { jwtType: 'refresh_token' });

	c.header(AUTH_HEADER_KEYS.ACCESS_TOKEN, accessToken);
	c.header(AUTH_HEADER_KEYS.REFRESH_TOKEN, refreshToken);
};
