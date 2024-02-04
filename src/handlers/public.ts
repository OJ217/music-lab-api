import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { poweredBy } from 'hono/powered-by';
import { secureHeaders } from 'hono/secure-headers';
import { Hono } from 'hono/tiny';

import { errorHandler } from '@/middleware/error.middleware';
import { setUpLambda } from '@/middleware/lambda.middleware';
import { articlePublicEndpointController } from '@/modules/article/article.controller';
import { authPublicEndpointController } from '@/modules/auth/auth.controller';
import { PublicEndpointBindings } from '@/types';

const app = new Hono<{ Bindings: PublicEndpointBindings }>();

// ** Middleware
app.use('*', logger());
app.use('*', poweredBy());
app.use('*', secureHeaders());
app.use('*', compress({ encoding: 'gzip' }));
app.use('*', csrf({ origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app'] }));
app.use('*', cors({ credentials: true, origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app'] }));
app.use('*', setUpLambda);

// ** Routes
app.get('/', c => c.body('Music Lab Public API 🎹🔬 (Powered by Hono x Serverless 🚀)'));
app.route('/articles', articlePublicEndpointController);
app.route('/auth', authPublicEndpointController);

// ** Error handler
app.onError(errorHandler);

export const publicEndpointHandler = handle(app);
