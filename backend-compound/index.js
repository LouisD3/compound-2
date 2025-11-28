require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");
const { exec } = require("child_process");

const app = express();
const port = 3000;

// ⚠️ Mets ton IP locale ici (la même que dans l'app React Native)
const SERVER_IP = "192.168.1.245"; // <--- à changer

// Client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Autoriser les requêtes depuis ton app mobile
app.use(cors());

// Multer : dossier temporaire
const upload = multer({
  dest: path.join(__dirname, "uploads"),
});

// Servir les vidéos "traitées"
app.use("/processed", express.static(path.join(__dirname, "processed")));

// Helper : fonction de transcription Whisper
async function transcribeWithWhisper(filePath) {
  console.log("Transcription avec Whisper en cours...");

  const fileStream = fs.createReadStream(filePath);

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: "whisper-1", // modèle speech-to-text
    response_format: "json", // tu peux mettre 'verbose_json' plus tard
    // language: 'fr',           // optionnel : laisser Whisper détecter
  });

  console.log("Transcription terminée");
  // Pour response_format: 'json', c'est généralement response.text
  return response.text || response;
}

function processVideoWithFFmpeg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -y -i "${inputPath}" \
-af "silenceremove=start_periods=1:start_duration=0.1:start_threshold=-25dB:stop_periods=1:stop_duration=0.1:stop_threshold=-25dB" \
-c:v libx264 -preset veryfast -crf 23 \
-c:a aac -b:a 128k \
-movflags +faststart "${outputPath}"`;

    console.log("Commande FFmpeg :", cmd);

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Erreur FFmpeg :", error);
        console.error("stderr :", stderr);
        return reject(error);
      }

      console.log("FFmpeg terminé avec succès");
      resolve();
    });
  });
}

function extractAudioForWhisper(inputVideoPath) {
  return new Promise((resolve, reject) => {
    const audioDir = path.join(__dirname, "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir);
    }

    const baseName = path.basename(
      inputVideoPath,
      path.extname(inputVideoPath)
    );
    const audioPath = path.join(audioDir, baseName + ".wav");

    // On sort un .wav 16 kHz mono (format ultra standard)
    const cmd = `ffmpeg -y -i "${inputVideoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`;

    console.log("Commande FFmpeg audio :", cmd);

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Erreur FFmpeg audio :", error);
        console.error("stderr :", stderr);
        return reject(error);
      }

      console.log("Extraction audio terminée :", audioPath);
      resolve(audioPath);
    });
  });
}

// Route pour recevoir la vidéo
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("Fichier reçu :", req.file);

  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const originalPath = req.file.path;

  // === 1. Ajouter une extension au fichier ===
  let ext = path.extname(req.file.originalname);
  if (!ext) {
    ext = ".mp4"; // fallback
  }

  const fileWithExtPath = path.join(
    path.dirname(originalPath),
    req.file.filename + ext
  );

  fs.renameSync(originalPath, fileWithExtPath);

  // === 2. Préparer le dossier processed ===
  const processedDir = path.join(__dirname, "processed");
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir);
  }

  const processedFileName = req.file.filename + ext;
  const processedPath = path.join(processedDir, processedFileName);

  try {
    // 3. Traitement vidéo avec FFmpeg (silences début/fin)
    await processVideoWithFFmpeg(fileWithExtPath, processedPath);

    // 4. Extraction audio pour Whisper **à partir de la vidéo déjà coupée**
    const audioPathForWhisper = await extractAudioForWhisper(processedPath);

    // 5. Transcription
    const transcriptionText = await transcribeWithWhisper(audioPathForWhisper);

    const processedVideoUrl = `http://${SERVER_IP}:${port}/processed/${processedFileName}`;

    res.json({
      message: "Vidéo traitée (FFmpeg) + transcription générée",
      processedVideoUrl,
      transcription: transcriptionText,
    });
  } catch (err) {
    console.error("Erreur traitement :", err);
    res.status(500).json({ error: "Erreur lors du traitement de la vidéo" });
  }
});

app.listen(port, () => {
  console.log(`Serveur backend lancé sur http://localhost:${port}`);
});
