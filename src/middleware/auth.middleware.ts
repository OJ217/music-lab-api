import { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

import { AUTH_COOKIE_KEYS, AUTH_COOKIE_OPTIONS } from '@/config/cookie.config';
import User from '@/modules/user/user.model';
import { AuthenticatorContextPayload, PrivateEndpointBindings } from '@/types';
import { extractToken, generateToken } from '@/util/auth.util';

// ** Authenticator Middleware for Private Endpoints
export const authenticateUser: MiddlewareHandler<{ Bindings: PrivateEndpointBindings }> = async (c, next) => {
	const accessTokenRaw = getCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN);
	const refreshTokenRaw = getCookie(c, AUTH_COOKIE_KEYS.REFRESH_TOKEN);

	console.log({ accessTokenRaw, refreshTokenRaw });

	if (!accessTokenRaw) throw new HTTPException(401, { message: 'Unauthenticated: No cookies' });

	const accessToken = extractToken(accessTokenRaw, 'access_token');

	if (accessToken.valid) {
		console.log('Authenticating using access token 🔑✅');
		c.env.authenticator = accessToken.decoded.payload;
		return await next();
	}

	if (accessToken.expired && refreshTokenRaw) {
		const refreshToken = extractToken(refreshTokenRaw, 'refresh_token');

		if (!refreshToken.valid) throw new HTTPException(401, { message: 'Unauthenticated: Invalid token' });

		const user = await User.findById(refreshToken.decoded.payload.id).lean();

		if (!user) {
			deleteCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN);
			deleteCookie(c, AUTH_COOKIE_KEYS.REFRESH_TOKEN);
			throw new HTTPException(401, { message: 'Unauthenticated: User not found' });
		}

		const userId = user._id.toString();

		const authTokenPayload: AuthenticatorContextPayload = {
			id: userId,
			email: user.email,
		};

		const reIssuedAccessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
		setCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN, reIssuedAccessToken, AUTH_COOKIE_OPTIONS.ACCESS_TOKEN);

		console.log('Reissuing access token 🛠️✅');
		c.env.authenticator = authTokenPayload;
		return await next();
	}

	throw new HTTPException(401, { message: 'Unauthenticated: Invalid token' });
};
