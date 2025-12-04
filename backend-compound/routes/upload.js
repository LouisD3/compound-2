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
  burnSubtitlesIntoVideo,
} = require("../services/ffmpegService");

const {
  transcribeWithWhisperVerbose,
  writeSrtFile,
  splitLongSegments,
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

    // Sous-titres sur la vidéo finale
    const audioForWhisper = await extractAudio(processedPath);
    const whisperData = await transcribeWithWhisperVerbose(audioForWhisper);

    // Génération du fichier .srt
    // On se base sur le nom de la vidéo traitée sans extension
    const baseName = path.basename(
      processedFileName,
      path.extname(processedFileName)
    );
    const { srtPath, srtFileName, segments: shortSegments } = await writeSrtFile(
      whisperData.segments || [],
      baseName
    );

    // Utiliser les segments courts pour la réponse
    const finalSubtitles = shortSegments || splitLongSegments(whisperData.segments || [], 40, 3);

    const srtUrl = `http://${SERVER_IP}:${port}/subtitles/${srtFileName}`;

    // ✨ Incruster les sous-titres directement dans la vidéo
    const videoWithSubtitlesPath = path.join(
      path.dirname(processedPath),
      baseName + '_with_subs' + path.extname(processedFileName)
    );
    
    try {
      await burnSubtitlesIntoVideo(processedPath, srtPath, videoWithSubtitlesPath, {
        fontSize: 14,  // Style TikTok (réduit de 24 à 14)
        fontColor: 'white',
        backgroundColor: 'black@0.7',
        marginBottom: 20,  // Réduit de 30 à 20
      });

      // Utiliser la vidéo avec sous-titres incrustés comme vidéo finale
      const finalVideoFileName = path.basename(videoWithSubtitlesPath);
      const processedVideoUrl = `http://${SERVER_IP}:${port}/processed/${finalVideoFileName}`;

      res.json({
        message: "Vidéo nettoyée + sous-titres générés et incrustés",
        processedVideoUrl,
        subtitlesUrl: srtUrl,
        srtFileName,
        nonSilentSegments,
        fullText: whisperData.text || "",
        subtitles: finalSubtitles, // Utiliser les segments courts
      });
    } catch (subtitleError) {
      console.error("Erreur lors de l'incrustation des sous-titres :", subtitleError);
      // En cas d'erreur, on retourne quand même la vidéo sans sous-titres incrustés
      const processedVideoUrl = `http://${SERVER_IP}:${port}/processed/${processedFileName}`;
      
      // Utiliser les segments courts même en cas d'erreur
      const finalSubtitlesFallback = splitLongSegments(whisperData.segments || [], 40, 3);
      
      res.json({
        message: "Vidéo nettoyée + sous-titres générés (non incrustés)",
        processedVideoUrl,
        subtitlesUrl: srtUrl,
        srtFileName,
        nonSilentSegments,
        fullText: whisperData.text || "",
        subtitles: finalSubtitlesFallback, // Utiliser les segments courts
        warning: "Les sous-titres n'ont pas pu être incrustés dans la vidéo",
      });
    }
  } catch (err) {
    console.error("Erreur traitement :", err);
    res.status(500).json({ error: "Erreur lors du traitement de la vidéo" });
  }
});

module.exports = router;
