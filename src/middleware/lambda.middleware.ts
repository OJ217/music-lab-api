import { MiddlewareHandler } from 'hono';
import { logger } from 'hono/logger';

import { PrivateEndpointBindings } from '@/types';
import connectDB from '@/util/db.util';

// ** AWS Lambda Function Setup Middleware
export const setUpLambda: MiddlewareHandler<{ Bindings: PrivateEndpointBindings }> = async (c, next) => {
	logger();
	c.env.lambdaContext.callbackWaitsForEmptyEventLoop = false;
	void connectDB();
	await next();
};
