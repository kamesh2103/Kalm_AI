// src/utils/imageToBase64.js

/**
 * Convert a File (from <input type="file">) into a base64 data URL.
 * The returned string is ready to be sent to Groq as `image_url.url`.
 *
 * @param {File} file
 * @returns {Promise<string>} e.g. "data:image/jpeg;base64,/9j/4AAQ..."
 */
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // already includes the data URL prefix
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });