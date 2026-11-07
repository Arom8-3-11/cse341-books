import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json' with { type: 'json' };
import router from './src/router.js';

const app = express();

// Serve the pre-generated API reference at /api-docs.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.json({ limit: '16kb', strict: false }));

app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Server is running' });
});

app.use(router);

app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON' });
    }
    if (error.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Request body too large' });
    }
    console.error('Unhandled request error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
});

export default app;
