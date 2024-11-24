import express from "express";
import fs from "fs";
import { API_ROUTES } from "../../shared/constants.js";
import logger from "../../shared/utils/logger.js";
const router = express.Router();
router.get(API_ROUTES.GET_CURRENT_DIRECTORY, (req, res) => {
    try {
        const mainDir = process.env.MAIN_DIRECTORY;
        if (!mainDir) {
            throw new Error("MAIN_DIRECTORY is not set in environment variables");
        }
        if (fs.existsSync(mainDir)) {
            res.status(200).json({ currentDirectory: mainDir });
        }
        else {
            res.status(404).json({ error: "Main directory not found" });
        }
    }
    catch (error) {
        logger.error("Error in getCurrentDirectory:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
export default router;
//# sourceMappingURL=getCurrentDirectory.js.map