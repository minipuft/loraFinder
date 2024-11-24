import express from "express";
import Image from "../models/Image";
import { z } from "zod";
import { API_ROUTES } from "../../shared/constants.js";
import { handleApiError } from "../utils/errorHandler.js";
const router = express.Router();
const querySchema = z.object({
    folder: z.string().min(1)
});
router.get(API_ROUTES.IMAGES, async (req, res) => {
    const result = querySchema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({ error: "Invalid input", details: result.error.issues });
    }
    const { folder } = result.data;
    try {
        const images = await Image.find({ folder }).lean();
        res.status(200).json(images);
    }
    catch (error) {
        handleApiError(res, error, "Failed to fetch images");
    }
});
export default router;
//# sourceMappingURL=images.js.map