/**
 * Firebase Cloud Functions for Masar Tamayoz
 * Handles secure Cloudinary signature generation for signed PDF uploads
 */

const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");

// Define Cloudinary API Secret stored in Firebase Secret Manager
const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");

/**
 * Callable Firebase Cloud Function: getCloudinaryUploadSignature
 * Called directly via Firebase SDK: httpsCallable(functions, 'getCloudinaryUploadSignature')
 */
exports.getCloudinaryUploadSignature = onCall(
  { secrets: [cloudinaryApiSecret], cors: true },
  async (request) => {
    const { public_id } = request.data || {};
    if (!public_id) {
      throw new HttpsError("invalid-argument", "المعرف (public_id) مطلوب لإنشاء التوقيع");
    }

    const secret = cloudinaryApiSecret.value() || process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY || "133245976525348";
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "dv5xhvkr3";

    if (!secret) {
      throw new HttpsError("failed-precondition", "CLOUDINARY_API_SECRET غير مهيأ في إعدادات الخادم / Firebase Secret");
    }

    const timestamp = Math.round(Date.now() / 1000);
    // Cloudinary signature parameters sorted alphabetically:
    // invalidate=true, overwrite=true, public_id, timestamp
    const strToSign = `invalidate=true&overwrite=true&public_id=${public_id}&timestamp=${timestamp}${secret}`;
    const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

    return {
      signature,
      timestamp,
      apiKey,
      cloudName,
      publicId: public_id,
      overwrite: true,
      invalidate: true,
      resourceType: "image",
    };
  }
);

/**
 * HTTPS Firebase Cloud Function: signCloudinaryUpload
 * Accessible via HTTP POST from any client or webhook
 */
exports.signCloudinaryUpload = onRequest(
  { secrets: [cloudinaryApiSecret], cors: true },
  async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const { public_id } = req.body || {};
      if (!public_id) {
        res.status(400).json({ error: "public_id is required" });
        return;
      }

      const secret = cloudinaryApiSecret.value() || process.env.CLOUDINARY_API_SECRET;
      const apiKey = process.env.CLOUDINARY_API_KEY || "133245976525348";
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "dv5xhvkr3";

      if (!secret) {
        res.status(500).json({ error: "CLOUDINARY_API_SECRET is not configured" });
        return;
      }

      const timestamp = Math.round(Date.now() / 1000);
      const strToSign = `invalidate=true&overwrite=true&public_id=${public_id}&timestamp=${timestamp}${secret}`;
      const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

      res.status(200).json({
        signature,
        timestamp,
        apiKey,
        cloudName,
        publicId: public_id,
        overwrite: true,
        invalidate: true,
        resourceType: "image",
      });
    } catch (err) {
      console.error("Cloud Function Error:", err);
      res.status(500).json({ error: err.message || "Internal error" });
    }
  }
);
