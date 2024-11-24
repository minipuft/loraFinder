import mongoose, { Schema } from 'mongoose';
const ImageSchema = new Schema({
    title: { type: String, required: true },
    src: { type: String, required: true },
    alt: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    folder: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
});
export default mongoose.model('Image', ImageSchema);
//# sourceMappingURL=Image.js.map