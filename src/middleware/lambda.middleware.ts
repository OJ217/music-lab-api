import { MiddlewareHandler } from 'hono';

import { PrivateEndpointBindings } from '@/types';
import connectDB from '@/util/db.util';

// ** AWS Lambda Function Setup Middleware
export const setUpLambda: MiddlewareHandler<{ Bindings: PrivateEndpointBindings }> = async (c, next) => {
	// ** Response Headers
	const { logStreamName, awsRequestId, invokedFunctionArn } = c.env.lambdaContext;
	c.header('x-amzn-cw-logstream', logStreamName);
	c.header('x-amzn-lambda-requestid', awsRequestId);
	c.header('x-amzn-lambda-arn', invokedFunctionArn);

	// ** Event Loop
	c.env.lambdaContext.callbackWaitsForEmptyEventLoop = false;

	void connectDB();
	await next();
};
