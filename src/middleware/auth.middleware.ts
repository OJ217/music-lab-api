import { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

import { AUTH_COOKIE_KEYS, AUTH_COOKIE_OPTIONS } from '@/config/auth.config';
import User from '@/modules/user/user.model';
import { AuthenticatorContextPayload, PrivateEndpointBindings } from '@/types';
import { extractToken, generateToken } from '@/util/auth.util';

// ** Authenticator Middleware for Private Endpoints

// ** For authentication using cookies
export const authenticateUserCookies: MiddlewareHandler<{ Bindings: PrivateEndpointBindings }> = async (c, next) => {
	const accessTokenRaw = getCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN) as string;
	const refreshTokenRaw = getCookie(c, AUTH_COOKIE_KEYS.REFRESH_TOKEN) as string;

	if (!accessTokenRaw && !refreshTokenRaw) throw new HTTPException(401, { message: 'Unauthenticated: No access_token' });

	const accessToken = extractToken(accessTokenRaw, 'access_token');

	if (accessToken.valid) {
		console.log('Authenticating using access token 🔑✅');
		c.env.authenticator = accessToken.decoded.payload;
		return await next();
	}

	if ((accessToken.expired || !accessToken) && refreshTokenRaw) {
		const refreshToken = extractToken(refreshTokenRaw, 'refresh_token');

		if (!refreshToken.valid) throw new HTTPException(401, { message: 'Unauthenticated: Invalid refresh_token' });

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

	throw new HTTPException(401, { message: 'Unauthenticated: Invalid request' });
};

// ** For authentication using headers
export const authenticateUserHeaders: MiddlewareHandler<{ Bindings: PrivateEndpointBindings }> = async (c, next) => {
	const accessTokenRaw = c.req.header('Music-Lab-X-Access-Token') as string;
	const refreshTokenRaw = c.req.header('Music-Lab-X-Refresh-Token') as string;

	if (!accessTokenRaw) throw new HTTPException(401, { message: 'Unauthenticated: No access_token' });

	const accessToken = extractToken(accessTokenRaw, 'access_token');

	if (accessToken.valid) {
		console.log('Authenticating using access token 🔑✅');
		c.env.authenticator = accessToken.decoded.payload;
		return await next();
	}

	if ((accessToken.expired || !accessToken) && refreshTokenRaw) {
		const refreshToken = extractToken(refreshTokenRaw, 'refresh_token');

		if (!refreshToken.valid) throw new HTTPException(401, { message: 'Unauthenticated: Invalid refresh_token' });

		const user = await User.findById(refreshToken.decoded.payload.id).lean();

		if (!user) {
			throw new HTTPException(401, { message: 'Unauthenticated: User not found' });
		}

		const userId = user._id.toString();

		const authTokenPayload: AuthenticatorContextPayload = {
			id: userId,
			email: user.email,
		};

		const reIssuedAccessToken = generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
		c.header('Music-Lab-X-Access-Token', reIssuedAccessToken);

		console.log('Reissuing access token 🛠️✅');
		c.env.authenticator = authTokenPayload;
		return await next();
	}

	throw new HTTPException(401, { message: 'Unauthenticated: Invalid request' });
};

// ** serverless.yaml configuration for custom authorization
// ** verify-token:
// **     handler: ./src/handlers/authorizer.authorizerHandler
// **
// ** authorizer:
// **     type: request
// **     name: verify-token
// **     identitySource:
// **         - $request.header.Music-Lab-X-Access-Token
// **         - $request.header.Music-Lab-X-Refresh-Token
