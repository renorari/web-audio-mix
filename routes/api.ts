/*
    Web Audio Mix - API Routes
*/

import express from "express";
import multer from "multer";
import cp from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { Express } from "express";

const router = express.Router();

// Status Check Endpoint
router.get("/status", (req, res) => {
    res.json({ "status": "ok", "timestamp": Date.now() });
});

// Audio Processing Endpoint
router.post("/upload", multer().array("files"), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ "status": "error", "message": "No files uploaded" });
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wam-"));
    const inputFiles: string[] = [];
    const outputFile = path.join(tempDir, "output.mp3");

    try {
        // Save uploaded files to temp directory
        for (const [index, file] of (req.files as Express.Multer.File[]).entries()) {
            const filePath = path.join(tempDir, `input_${index}${path.extname(file.originalname)}`);
            await fs.writeFile(filePath, file.buffer);
            inputFiles.push(filePath);
        }

        // Construct ffmpeg command
        const ffmpegArgs = [];
        inputFiles.forEach((file) => {
            ffmpegArgs.push("-i", file);
        });
        ffmpegArgs.push("-filter_complex", `amix=inputs=${inputFiles.length}:duration=longest`, "-c:a", "libmp3lame", "-q:a", "2", outputFile);

        // Execute ffmpeg
        cp.execFileSync("ffmpeg", ffmpegArgs);

        // Send the output file
        res.download(outputFile, `${Date.now()}_mixed_audio.mp3`, async (err) => {
            if (err) {
                console.error("Error sending file:", err);
            }

            // Clean up temp files
            await fs.rm(tempDir, { "recursive": true, "force": true });
        });
    } catch (error) {
        console.error("Error processing audio:", error);
        await fs.rm(tempDir, { "recursive": true, "force": true });
        res.status(500).json({ "status": "error", "message": "Audio processing failed" });
    }
});

// 404 Handler
router.use((req, res) => {
    res.status(404).json({ "status": "error", "message": "Not Found" });
});

export default router;
