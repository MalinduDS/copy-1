/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface DetectedObject {
    label: string;
    box: BoundingBox;
}

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    // FIX: Use process.env.API_KEY to get the API key as per the guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    // FIX: Use process.env.API_KEY to get the API key as per the guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    // FIX: Use process.env.API_KEY to get the API key as per the guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Composites a foreground image onto a background image.
 * @param foregroundImage The image containing the subject.
 * @param backgroundImage The new background image.
 * @returns A promise that resolves to the data URL of the composited image.
 */
export const compositeWithBackground = async (
    foregroundImage: File,
    backgroundImage: File,
): Promise<string> => {
    console.log(`Starting background composition...`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const foregroundImagePart = await fileToPart(foregroundImage);
    const backgroundImagePart = await fileToPart(backgroundImage);
    
    const prompt = `You are an expert photo editor AI. The user has provided two images. The first image contains a subject, and the second image is a new background.
Your task is to:
1.  Identify and isolate the main subject from the first image. The subject is likely the most prominent person, animal, or object.
2.  Realistically composite this isolated subject onto the second image (the background).
3.  Pay close attention to matching lighting, shadows, color temperature, and perspective to create a seamless and believable final image. The subject should look like it naturally belongs in the new environment.
4.  If the foreground image contains a person, their identity and features must be preserved exactly.

Output: Return ONLY the final composited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending images and composition prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [foregroundImagePart, backgroundImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    console.log('Received response from model for composition.', response);
    
    return handleApiResponse(response, 'composition');
};

/**
 * Detects objects in an image and returns their labels and bounding boxes.
 * @param image The image file to analyze.
 * @returns A promise that resolves to an array of detected objects.
 */
export const detectObjects = async (
    image: File
): Promise<DetectedObject[]> => {
    console.log('Starting object detection...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imagePart = await fileToPart(image);
    const prompt = `Analyze this image and identify the main objects within it. For each distinct object you find, provide a concise label and its bounding box coordinates. The coordinates should be in pixels, with (0,0) being the top-left corner. Return the output as a JSON array.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        label: {
                            type: Type.STRING,
                            description: 'A short, descriptive label for the detected object (e.g., "cat", "red car", "tree").',
                        },
                        box: {
                            type: Type.OBJECT,
                            properties: {
                                x1: { type: Type.NUMBER, description: 'The x-coordinate of the top-left corner of the bounding box.' },
                                y1: { type: Type.NUMBER, description: 'The y-coordinate of the top-left corner of the bounding box.' },
                                x2: { type: Type.NUMBER, description: 'The x-coordinate of the bottom-right corner of the bounding box.' },
                                y2: { type: Type.NUMBER, description: 'The y-coordinate of the bottom-right corner of the bounding box.' },
                            },
                            required: ['x1', 'y1', 'x2', 'y2'],
                        },
                    },
                    required: ['label', 'box'],
                },
            },
        },
    });
    console.log('Received object detection response from model.', response);

    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    try {
        const jsonText = response.text.trim();
        if (!jsonText) {
            console.warn('Object detection returned empty text response.');
            return [];
        }
        const detectedObjects: DetectedObject[] = JSON.parse(jsonText);
        // Validate the structure
        if (!Array.isArray(detectedObjects)) {
            throw new Error('Parsed JSON is not an array.');
        }
        return detectedObjects;
    } catch (e) {
        console.error('Failed to parse JSON response for object detection:', e, 'Raw Text:', response.text);
        throw new Error('The AI model returned an invalid format for object detection. Please try again.');
    }
};

type Resolution = 'HD' | 'FHD' | '4K' | '8K';

const resolutionConfig = {
    'HD': { name: 'HD resolution (1280 x 720 pixels)', pixels: 1280 },
    'FHD': { name: 'Full HD resolution (1920 x 1080 pixels)', pixels: 1920 },
    '4K': { name: '4K UHD resolution (3840 x 2160 pixels)', pixels: 3840 },
    '8K': { name: '8K UHD resolution (7680 x 4320 pixels)', pixels: 7680 },
};

/**
 * Upscales an image to a specified resolution using generative AI.
 * @param originalImage The original image file.
 * @param resolution The target resolution ('HD', 'FHD', '4K', '8K').
 * @returns A promise that resolves to the data URL of the upscaled image.
 */
export const upscaleImage = async (
    originalImage: File,
    resolution: Resolution,
): Promise<string> => {
    const config = resolutionConfig[resolution];
    console.log(`Starting upscale to ${resolution} (${config.pixels}px)...`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are a world-class photo editing AI specializing in image upscaling. Your task is to upscale the provided image to ${config.name}. The final image's longest side should be exactly ${config.pixels} pixels.

Upscaling Guidelines:
- Enhance fine details, sharpness, and clarity to a photorealistic level suitable for high-resolution displays.
- Maintain the original image's content, composition, and color grading perfectly. Do not add, remove, or alter any elements.
- The final output must be free of digital artifacts, noise, or unnatural textures.

Output: Return ONLY the final, high-resolution upscaled image. Do not return text.`;
    const textPart = { text: prompt };

    console.log(`Sending image and upscale prompt for ${resolution} to the model...`);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    console.log(`Received response from model for ${resolution} upscale.`, response);
    
    return handleApiResponse(response, `upscale to ${resolution}`);
};