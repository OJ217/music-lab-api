import { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { ObjectId } from 'mongodb';

import { AUTH_COOKIE_KEYS, AUTH_COOKIE_OPTIONS } from '@/constants/auth.constant';
import { UserService } from '@/modules/user/user.service';
import { AuthService } from '@/services/auth.service';
import { IAuthenticatorContextPayload, IPrivateEndpointBindings } from '@/types/api.type';
import { HttpStatus } from '@/utils/api.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';

// ** Authenticator Middleware for Private Endpoints

// ** For authentication using cookies
export const authenticateUserCookies: MiddlewareHandler<{ Bindings: IPrivateEndpointBindings }> = async (c, next) => {
	const accessTokenRaw = getCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN) as string;
	const refreshTokenRaw = getCookie(c, AUTH_COOKIE_KEYS.REFRESH_TOKEN) as string;

	if (!accessTokenRaw && !refreshTokenRaw)
		throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, {
			message: 'Unauthenticated: Invalid access_token',
		});

	const accessToken = AuthService.extractToken(accessTokenRaw);

	if (accessToken.valid) {
		console.log('Authenticating using access token 🔑✅');
		c.env.authenticator = accessToken.decoded.payload;
		return await next();
	}

	if ((accessToken.expired || !accessToken) && refreshTokenRaw) {
		const refreshToken = AuthService.extractToken(refreshTokenRaw);

		if (!refreshToken.valid) throw new HTTPException(401, { message: 'Unauthenticated: Invalid refresh_token' });

		const user = await UserService.fetchById(new ObjectId(refreshToken.decoded.payload.id));

		if (!user) {
			deleteCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN);
			deleteCookie(c, AUTH_COOKIE_KEYS.REFRESH_TOKEN);
			throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.NOT_FOUND, {
				isReadableMessage: true,
				message: 'err.user_not_found',
			});
		}

		const userId = user._id.toString();

		const authTokenPayload: IAuthenticatorContextPayload = {
			id: userId,
			email: user.email,
		};

		const reIssuedAccessToken = AuthService.generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
		setCookie(c, AUTH_COOKIE_KEYS.ACCESS_TOKEN, reIssuedAccessToken, AUTH_COOKIE_OPTIONS.ACCESS_TOKEN);

		console.log('Reissuing access token 🛠️✅');
		c.env.authenticator = authTokenPayload;

		return await next();
	}

	throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, {
		isReadableMessage: false,
		message: 'Unauthenticated: Invalid request',
	});
};

// ** For authentication using headers
const authenticateUserHeaders: MiddlewareHandler<{ Bindings: IPrivateEndpointBindings }> = async (c, next) => {
	const accessTokenRaw = c.req.header('Music-Lab-X-Access-Token') as string;
	const refreshTokenRaw = c.req.header('Music-Lab-X-Refresh-Token') as string;

	if (!accessTokenRaw)
		throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, {
			message: 'Unauthenticated: Invalid access_token',
		});

	const accessToken = AuthService.extractToken(accessTokenRaw);

	if (accessToken.valid) {
		console.info('Authenticating using access token 🔑✅');
		c.env.authenticator = accessToken.decoded.payload;
		return await next();
	}

	if ((accessToken.expired || !accessToken) && refreshTokenRaw) {
		const refreshToken = AuthService.extractToken(refreshTokenRaw);

		if (!refreshToken.valid)
			throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, {
				message: 'Unauthenticated: Invalid refresh_token',
			});

		const user = await UserService.fetchById(new ObjectId(refreshToken.decoded.payload.id));

		if (!user) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.NOT_FOUND, {
				isReadableMessage: true,
				message: 'err.user_not_found',
			});
		}

		const userId = user._id.toString();

		const authTokenPayload: IAuthenticatorContextPayload = {
			id: userId,
			email: user.email,
		};

		const reIssuedAccessToken = AuthService.generateToken(userId, authTokenPayload, { jwtType: 'access_token' });
		c.header('Music-Lab-X-Access-Token', reIssuedAccessToken);

		console.log('Reissuing access token 🛠️✅');
		c.env.authenticator = authTokenPayload;

		return await next();
	}

	throw new ApiException(HttpStatus.UNAUTHORIZED, ApiErrorCode.UNAUTHORIZED, {
		isReadableMessage: false,
		message: 'Unauthenticated: Invalid request',
	});
};

export default authenticateUserHeaders;

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
