import { handle } from 'hono/aws-lambda';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { poweredBy } from 'hono/powered-by';
import { secureHeaders } from 'hono/secure-headers';

import authenticateUserHeaders from '@/middleware/auth.middleware';
import errorHandler from '@/middleware/error.middleware';
import setUpLambda from '@/middleware/lambda.middleware';
import earTrainingAnalyticsController from '@/modules/ear-training/analytics/ear-training-analytics.controller';
import earTrainingSessionController from '@/modules/ear-training/session/ear-training-session.controller';
import earTrainingStreakController from '@/modules/ear-training/streak/ear-training-streak.controller';
import userController from '@/modules/user/user.controller';
import { PrivateApiController } from '@/utils/api.util';

const app = new PrivateApiController();

// ** Middleware
app.use('*', logger());
app.use('*', poweredBy());
app.use('*', secureHeaders());
app.use('*', compress({ encoding: 'gzip' }));
app.use('*', csrf({ origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app', 'https://www.dev.music-lab.app'] }));
app.use('*', cors({ credentials: true, origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app', 'https://www.dev.music-lab.app'] }));
app.use('*', setUpLambda, authenticateUserHeaders);

// **Routes
app.route('/api/user', userController);
app.route('/api/ear-training/sessions', earTrainingSessionController);
app.route('/api/ear-training/analytics', earTrainingAnalyticsController);
app.route('/api/ear-training/streaks', earTrainingStreakController);

// ** Error handler
app.onError(errorHandler);

export const privateEndpointHandler = handle(app);
