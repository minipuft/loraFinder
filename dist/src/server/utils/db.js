// src/server/utils/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../../shared/utils/logger.js';
dotenv.config();
const uri = process.env.MONGODB_URI;
export const connectDB = async (retries = 5) => {
    while (retries) {
        try {
            await mongoose.connect(uri);
            logger.info('Connected to MongoDB successfully.');
            return;
        }
        catch (error) {
            logger.error(`Error connecting to MongoDB (${retries} retries left):`, error);
            retries -= 1;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying
        }
    }
    logger.error('Failed to connect to MongoDB after multiple retries');
    process.exit(1);
};
//# sourceMappingURL=db.js.map