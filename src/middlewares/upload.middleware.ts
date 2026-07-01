import multer from "multer";
import { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { uploadToS3 } from "../utils/s3-upload";

type UploadType = "single" | "array" | "fields";

interface UploadOptions {
    fieldName: string;
    maxSizeMB?: number;
    uploadType?: UploadType;
    maxCount?: number;
    folder?: string; // optional S3 folder
}

export const uploadFile = ({
    fieldName,
    maxSizeMB = 50,
    uploadType = "single",
    maxCount = 10,
    folder = "uploads",
}: UploadOptions) => {
    const multerInstance = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
    });

    let uploader: any;

    switch (uploadType) {
        case "single":
            uploader = multerInstance.single(fieldName);
            break;
        case "array":
            uploader = multerInstance.array(fieldName, maxCount);
            break;
        case "fields":
            uploader = multerInstance.fields([{ name: fieldName, maxCount }]);
            break;
        default:
            uploader = multerInstance.single(fieldName);
    }

    return async (req: Request, res: Response, next: NextFunction) => {
        uploader(req, res, async (err: any) => {
            if (err) return next(err);

            try {
                const buildObjectKey = (originalname: string) => {
                    const ext = path.extname(originalname);
                    return `${folder}/${crypto.randomUUID()}${ext}`;
                };

                /** SINGLE FILE */
                if (req.file) {
                    const key = buildObjectKey(req.file.originalname);

                    const fileUrl = await uploadToS3(
                        req.file.buffer,
                        key,
                        req.file.mimetype,
                    );

                    (req.file as any).fileUrl = fileUrl;
                }

                /** MULTIPLE FILES (array) */
                if (Array.isArray(req.files)) {
                    for (const file of req.files) {
                        const key = buildObjectKey(file.originalname);

                        file.fileUrl = await uploadToS3(
                            file.buffer,
                            key,
                            file.mimetype,
                        );
                    }
                }

                /** MULTIPLE FILES (fields) */
                if (req.files && !Array.isArray(req.files)) {
                    for (const fileArray of Object.values(req.files)) {
                        for (const file of fileArray as any[]) {
                            const key = buildObjectKey(file.originalname);

                            file.fileUrl = await uploadToS3(
                                file.buffer,
                                key,
                                file.mimetype,
                            );
                        }
                    }
                }

                next();
            } catch (error) {
                next(error);
            }
        });
    };
};
