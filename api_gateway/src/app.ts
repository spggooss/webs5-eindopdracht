// @ts-ignore
import cors from 'cors';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
// @ts-ignore
import express from 'express';
// @ts-ignore
import passport from 'passport';

import * as dotenv from 'dotenv';
import {router} from "./router/router";
dotenv.config();

const app = express();
const siteUrl: string = process.env.SITEURL ? process.env.SITEURL : 'http://localhost:3000';
const port: number = process.env.APIGATEWAYPORT ? parseInt(process.env.APIGATEWAYPORT) : 3000;


app.use(passport.initialize());
app.use(cors())
app.use(express.json({ limit: '200mb' }));


const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Photo prestiges API',
        version: '1.0.0',
        description: 'API documentation for the Photo prestiges API',
    },
    servers: [
        {
            url: siteUrl, // Replace with your server URL
        },
    ],
};

// Options for the swagger docs
const options = {
    swaggerDefinition,
    // Paths to files containing OpenAPI definitions
    apis: [`${__dirname}/router/*.ts`], // Adjust the path as necessary
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Use swagger-ui-express for your app documentation endpoint
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(router)


app.listen(port, () => {
    console.log('Server is up on port ' + port);
})