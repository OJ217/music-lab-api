import { IPrivateMiddlewareHandler } from '@/types/api.type';
import { HttpStatus } from '@/utils/api.util';
import { connectDB } from '@/utils/db.util';
import { ApiErrorCode, ApiException } from '@/utils/error.util';

// ** AWS Lambda Function Setup Middleware
const setUpLambda: IPrivateMiddlewareHandler = async (c, next) => {
	// ** Response Headers
	const { logStreamName, awsRequestId, invokedFunctionArn } = c.env.lambdaContext;
	c.header('x-amzn-cw-logstream', logStreamName);
	c.header('x-amzn-lambda-requestid', awsRequestId);
	c.header('x-amzn-lambda-arn', invokedFunctionArn);

	// ** Event Loop
	c.env.lambdaContext.callbackWaitsForEmptyEventLoop = false;

	try {
		await connectDB();
		await next();
	} catch (error) {
		console.info(error);
		throw new ApiException(HttpStatus.INTERNAL_ERROR, ApiErrorCode.INTERNAL_ERROR, {
			isReadableMessage: false,
			message: 'MongoDB: Error connecting to database 🔗❌',
		});
	}
};

export default setUpLambda;
