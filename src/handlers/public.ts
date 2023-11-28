import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { Hono } from 'hono/tiny';

import { setUpLambda } from '@/middleware/lambda.middleware';
import { articlePublicEndpointController } from '@/modules/article/article.controller';
import { authPublicEndpointController } from '@/modules/auth/auth.controller';
import { PublicEndpointBindings } from '@/types';

const app = new Hono<{ Bindings: PublicEndpointBindings }>();

app.get('/', c => c.text('Music Lab Public API 🎹🔬 (Powered by Hono x Serverless 🚀)'));

app.use('*', secureHeaders());
app.use('*', cors({ credentials: true, origin: ['http://localhost:3000', 'https://music-lab-next.vercel.app', 'https://www.music-lab.app'] }));
app.use('*', setUpLambda);

// Routes
app.route('/articles', articlePublicEndpointController);
app.route('/auth', authPublicEndpointController);

export const publicEndpointHandler = handle(app);
