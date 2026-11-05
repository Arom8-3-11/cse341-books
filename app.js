import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json' with { type: 'json' };
import router from './src/router.js';

const app = express();

// Serve the pre-generated API reference at /api-docs.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.json());

app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Server is running' });
});

app.use(router);

export default app;
