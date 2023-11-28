import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { Hono } from 'hono/tiny';

import { authenticateUserHeaders } from '@/middleware/auth.middleware';
import { setUpLambda } from '@/middleware/lambda.middleware';
import { articlePrivateEndpointController } from '@/modules/article/article.controller';
import { earTrainingPracticeSessionPrivateEndpointController } from '@/modules/ear-training/practice-session.controller';
import { userPrivateEndpointController } from '@/modules/user/user.controller';
import { PrivateEndpointBindings } from '@/types';

const app = new Hono<{ Bindings: PrivateEndpointBindings }>();

app.get('/', c => c.text('Music Lab Private API 🎹🔬 (Powered by Hono x Serverless 🚀)'));

app.use('*', secureHeaders());
app.use('*', cors({ credentials: true, origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app'] }));
app.use('*', setUpLambda, authenticateUserHeaders);

// Routes
app.route('/api/articles', articlePrivateEndpointController);
app.route('/api/users', userPrivateEndpointController);
app.route('/api/ear-training/practice-session', earTrainingPracticeSessionPrivateEndpointController);

export const privateEndpointHandler = handle(app);
