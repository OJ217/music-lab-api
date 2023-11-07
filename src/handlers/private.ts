import { handle } from 'hono/aws-lambda';
import { Hono } from 'hono/tiny';
import { cors } from 'hono/cors';

import { authenticateUser } from '@/middleware/auth.middleware';
import { setUpLambda } from '@/middleware/lambda.middleware';
import { articlePrivateEndpointController } from '@/modules/article/article.controller';
import { userPrivateEndpointController } from '@/modules/user/user.controller';
import { PrivateEndpointBindings } from '@/types';

const app = new Hono<{ Bindings: PrivateEndpointBindings }>();

app.get('/', c => c.text('Hono x Serverless 🚀'));

app.use('*', cors({ credentials: true, origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app'] }));
app.use('*', setUpLambda, authenticateUser);

// Routes
app.route('/api/articles', articlePrivateEndpointController);
app.route('/api/users', userPrivateEndpointController);

export const privateEndpointHandler = handle(app);
