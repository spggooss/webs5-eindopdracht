import cors from 'cors';
import express from 'express';
import axios, {AxiosError} from 'axios';
import connectToDatabase from "./database/mongooseConnection";
import passport from "passport";

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const imaggaApiKey = process.env.IMAGGA_API_KEY;

connectToDatabase();

app.use(passport.initialize());
app.use(cors());
app.use(express.json());

const AUTH_HEADER = 'Basic ' + imaggaApiKey;

// Function to train the index
async function trainIndex(indexEndpoint: string) {
    try {
        const response = await axios.put(indexEndpoint, null, {
            headers: {
                Authorization: AUTH_HEADER
            }
        });
        return response.data.result.ticket_id;
    } catch (error: any) {
        handleAxiosError(error);
        throw error;
    }
}

// Function to check if training is resolved
async function isResolved(ticketId: string, ticketsEndpoint: string) {
    try {
        const response = await axios.get(`${ticketsEndpoint}/${ticketId}`, {
            headers: {
                Authorization: AUTH_HEADER
            }
        });
        return response.data.result.is_final;
    } catch (error: any) {
        handleAxiosError(error);
        throw error;
    }
}

function handleAxiosError(error: AxiosError) {
    if (error.response) {
        console.error('Request failed with status:', error.response.status);
        console.error('Response data:', error.response.data);
    } else if (error.request) {
        console.error('Request failed:', error.request);
    } else {
        console.error('Error:', error.message);
    }
}

app.post('/upload-target', async (req, res) => {
    try {
        const { imageBase64 } = req.body;

        // Check if imageBase64 is provided
        if (!imageBase64) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // Make a request to Imagga API to get tags
        const response = await axios.post('https://api.imagga.com/v2/tags', {
            image_base64: imageBase64
        }, {
            headers: {
                Authorization: AUTH_HEADER
            }
        });

        // Handle response from Imagga API
        const { data } = response;
        // You can handle the Imagga API response here

        // Train the index
        const indexEndpoint = 'https://api.imagga.com/v2/similar-images/categories/general_v3/index_id'; // Replace 'index_id' with the actual index ID
        const ticketId = await trainIndex(indexEndpoint);

        // Check if training is resolved
        let resolved = false;
        while (!resolved) {
            resolved = await isResolved(ticketId, 'https://api.imagga.com/v2/tickets');
            console.log('Training status:', resolved ? 'resolved' : 'pending');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
        }

        // Send success response
        res.status(200).json({ data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log('Server is up on port ' + port);
});
