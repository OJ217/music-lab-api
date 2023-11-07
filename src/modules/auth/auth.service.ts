import { Context } from 'hono';
import { setCookie } from 'hono/cookie';

import { AUTH_COOKIE_KEYS, AUTH_COOKIE_OPTIONS } from '@/config/cookie.config';
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
