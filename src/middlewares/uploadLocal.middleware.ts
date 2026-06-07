import multer, { StorageEngine } from "multer";
import { storage } from "../config/multer";
import { Request, Response, NextFunction } from "express";

type UploadType = "single" | "array" | "fields";

interface UploadOptions {
  fieldName: string;
  maxSizeMB?: number;
  uploadType?: UploadType;
  maxCount?: number; // for array
}

export const uploadFile = ({
  fieldName,
  maxSizeMB = 50,
  uploadType = "single",
  maxCount = 10, // default for array
}: UploadOptions) => {
  const multerInstance = multer({
    storage,
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

  return (req: Request, res: Response, next: NextFunction) => {
    uploader(req, res, (err: any) => {
      if (err) return next(err);

      // attach fileUrl dynamically for single file
      if (req.file) {
        const protocol = req.protocol;
        const host = req.get("host");
        req.file.fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      }

      // attach fileUrl dynamically for multiple files
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach((file: any) => {
            file.fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
          });
        } else {
          // req.files can be { [fieldname]: File[] }
          Object.values(req.files).forEach((fileArray: any) => {
            fileArray.forEach((file: any) => {
              file.fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
            });
          });
        }
      }

      next();
    });
  };
};
