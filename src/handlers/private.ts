import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { poweredBy } from 'hono/powered-by';
import { secureHeaders } from 'hono/secure-headers';
import { Hono } from 'hono/tiny';

import { authenticateUserHeaders } from '@/middleware/auth.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { setUpLambda } from '@/middleware/lambda.middleware';
import { articlePrivateEndpointController } from '@/modules/article/article.controller';
import { earTrainingPracticeSessionPrivateEndpointController } from '@/modules/ear-training/practice-session.controller';
import { userPrivateEndpointController } from '@/modules/user/user.controller';
import { PrivateEndpointBindings } from '@/types';

const app = new Hono<{ Bindings: PrivateEndpointBindings }>();

// ** Middleware
app.use('*', logger());
app.use('*', poweredBy());
app.use('*', secureHeaders());
app.use('*', compress({ encoding: 'gzip' }));
app.use('*', csrf({ origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app'] }));
app.use('*', cors({ credentials: true, origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app'] }));
app.use('*', setUpLambda, authenticateUserHeaders);

// **Routes
app.get('/', c => c.text('Music Lab Private API 🎹🔬 (Powered by Hono x Serverless 🚀)'));
app.route('/api/articles', articlePrivateEndpointController);
app.route('/api/users', userPrivateEndpointController);
app.route('/api/ear-training/practice-session', earTrainingPracticeSessionPrivateEndpointController);

// ** Error handler
app.onError(errorHandler);

export const privateEndpointHandler = handle(app);
