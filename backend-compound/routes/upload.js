// routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  extractAudio,
  getMediaDuration,
  detectSilences,
  computeNonSilentSegments,
  cutAllNonSilentSegmentsAndConcat,
} = require("../services/ffmpegService");

const {
  transcribeWithWhisperVerbose,
  writeSrtFile,
} = require("../services/whisperService");

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
});

const SERVER_IP = "192.168.68.54"; // adapte si besoin
const port = 3000; // ou récup depuis process.env.PORT

router.post("/upload", upload.single("file"), async (req, res) => {
  console.log("Fichier reçu :", req.file);

  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const originalPath = req.file.path;

  try {
    let ext = path.extname(req.file.originalname);
    if (!ext) {
      ext = ".mp4";
    }

    const fileWithExtPath = path.join(
      path.dirname(originalPath),
      req.file.filename + ext
    );
    fs.renameSync(originalPath, fileWithExtPath);

    const processedDir = path.join(__dirname, "..", "processed");
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir);
    }

    const processedFileName = req.file.filename + ext;
    const processedPath = path.join(processedDir, processedFileName);

    const audioPath = await extractAudio(fileWithExtPath);
    const totalDuration = await getMediaDuration(audioPath);
    const silences = await detectSilences(audioPath);
    const nonSilentSegments = computeNonSilentSegments(silences, totalDuration);

    if (!nonSilentSegments.length) {
      console.warn(
        "Aucun segment non silencieux, on garde la vidéo telle quelle."
      );
      fs.copyFileSync(fileWithExtPath, processedPath);
    } else {
      await cutAllNonSilentSegmentsAndConcat(
        fileWithExtPath,
        processedPath,
        nonSilentSegments
      );
    }

    const processedVideoUrl = `http://${SERVER_IP}:${port}/processed/${processedFileName}`;

    // Sous-titres sur la vidéo finale
    const audioForWhisper = await extractAudio(processedPath);
    const whisperData = await transcribeWithWhisperVerbose(audioForWhisper);

    // Génération du fichier .srt
    // On se base sur le nom de la vidéo traitée sans extension
    const baseName = path.basename(
      processedFileName,
      path.extname(processedFileName)
    );
    const { srtPath, srtFileName } = await writeSrtFile(
      whisperData.segments || [],
      baseName
    );

    const srtUrl = `http://${SERVER_IP}:${port}/subtitles/${srtFileName}`;

    res.json({
      message: "Vidéo nettoyée + sous-titres générés",
      processedVideoUrl,
      subtitlesUrl: srtUrl,
      srtFileName,
      nonSilentSegments,
      fullText: whisperData.text || "",
      subtitles: whisperData.segments || [],
    });
  } catch (err) {
    console.error("Erreur traitement :", err);
    res.status(500).json({ error: "Erreur lors du traitement de la vidéo" });
  }
});

module.exports = router;
