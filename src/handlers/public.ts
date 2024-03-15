import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { poweredBy } from 'hono/powered-by';
import { secureHeaders } from 'hono/secure-headers';

import errorHandler from '@/middleware/error.middleware';
import setUpLambda from '@/middleware/lambda.middleware';
import authPublicController from '@/modules/auth/auth.controller';
import { PublicApiController } from '@/utils/api.util';

const app = new PublicApiController();

// ** Middleware
app.use('*', logger());
app.use('*', poweredBy());
app.use('*', secureHeaders());
app.use('*', compress({ encoding: 'gzip' }));
app.use('*', csrf({ origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app'] }));
app.use('*', cors({ credentials: true, origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app'] }));
app.use('*', setUpLambda);

// ** Routes
app.get('/', c => c.text('Music Lab API 🎹🔬 (Powered by Hono 🔥 x Serverless 🚀)'));
app.route('/auth', authPublicController);

// ** Error handler
app.onError(errorHandler);

console.table(app.routes.map(r => ({ path: r.path, method: r.method })));

export const publicEndpointHandler = handle(app);
