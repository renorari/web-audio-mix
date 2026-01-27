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

type TempFileEntry = {
    filePath: string;
    expiresAt: number;
};

const tempStore = new Map<string, TempFileEntry>();
const tempStoreDir = path.join(os.tmpdir(), "wam-store");
const tempTtlMs = Number(process.env.WAM_TEMP_TTL_MS ?? 15 * 60 * 1000);

const ensureStoreDir = async () => {
    await fs.mkdir(tempStoreDir, { "recursive": true });
};

const scheduleCleanup = () => {
    setInterval(async () => {
        const now = Date.now();
        for (const [id, entry] of tempStore.entries()) {
            if (entry.expiresAt <= now) {
                tempStore.delete(id);
                await fs.rm(entry.filePath, { "force": true });
            }
        }
    }, Math.max(30_000, Math.min(tempTtlMs, 5 * 60 * 1000)));
};

scheduleCleanup();

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

        await ensureStoreDir();
        const downloadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const storedFilePath = path.join(tempStoreDir, `${downloadId}.mp3`);
        await fs.copyFile(outputFile, storedFilePath);

        tempStore.set(downloadId, {
            "filePath": storedFilePath,
            "expiresAt": Date.now() + tempTtlMs
        });

        // Clean up per-request temp files
        await fs.rm(tempDir, { "recursive": true, "force": true });

        res.redirect(302, `/api/download/${downloadId}`);
    } catch (error) {
        console.error("Error processing audio:", error);
        await fs.rm(tempDir, { "recursive": true, "force": true });
        res.status(500).json({ "status": "error", "message": "Audio processing failed" });
    }
});

// Download Endpoint (multi-download with TTL)
router.get("/download/:id", async (req, res) => {
    const id = req.params.id;
    const entry = tempStore.get(id);
    if (!entry) {
        return res.status(404).json({ "status": "error", "message": "Not Found" });
    }
    if (entry.expiresAt <= Date.now()) {
        tempStore.delete(id);
        await fs.rm(entry.filePath, { "force": true });
        return res.status(410).json({ "status": "error", "message": "Expired" });
    }

    res.download(entry.filePath, `${Date.now()}_mixed_audio.mp3`);
});

// 404 Handler
router.use((req, res) => {
    res.status(404).json({ "status": "error", "message": "Not Found" });
});

export default router;
