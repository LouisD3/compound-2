require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const fsPromises = require("fs").promises;

const app = express();
const port = 3000;

// ⚠️ Mets ton IP locale ici (la même que dans ton App.js)
const SERVER_IP = "192.168.68.54";

app.use(cors());

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`
  );
  next();
});

const upload = multer({
  dest: path.join(__dirname, "uploads"),
});

// Servir les vidéos traitées
app.use("/processed", express.static(path.join(__dirname, "processed")));

// Route de test pour vérifier la connexion
app.get("/test", (req, res) => {
  res.json({
    message: "Serveur backend opérationnel !",
    timestamp: new Date().toISOString(),
  });
});

// ---------- HELPERS FFmpeg ----------

// 1) Extraire l'audio en .wav pour analyse des silences
function extractAudio(inputVideoPath) {
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

    // Meilleure qualité audio pour une détection plus précise
    const cmd = `ffmpeg -y -i "${inputVideoPath}" -vn -acodec pcm_s16le -ar 44100 -ac 1 -af "highpass=f=200,lowpass=f=3000" "${audioPath}"`;
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

// 2) Récupérer la durée de l'audio (en secondes)
function getMediaDuration(filePath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "${filePath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Erreur ffprobe :", error);
        return reject(error);
      }
      const duration = parseFloat(stdout.trim());
      console.log("Durée media :", duration, "s");
      resolve(duration);
    });
  });
}

// 3) Détecter tous les silences via silencedetect
function detectSilences(audioPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -i "${audioPath}" -af silencedetect=noise=-35dB:d=0.8 -f null -`;

    console.log("Commande FFmpeg silencedetect :", cmd);

    exec(cmd, (error, stdout, stderr) => {
      const lines = stderr.split("\n");
      const silences = [];
      let currentStart = null;

      for (const line of lines) {
        const startMatch = line.match(/silence_start:\s*([\d\.]+)/);
        if (startMatch) {
          currentStart = parseFloat(startMatch[1]);
        }
        const endMatch = line.match(/silence_end:\s*([\d\.]+)/);
        if (endMatch && currentStart !== null) {
          const end = parseFloat(endMatch[1]);
          silences.push({ start: currentStart, end });
          currentStart = null;
        }
      }

      console.log("Silences détectés :", silences);
      resolve(silences);
    });
  });
}

// 4) Transformer les silences en segments non silencieux
function computeNonSilentSegments(silences, totalDuration) {
  const segments = [];
  let cursor = 0;

  // On part de TOUS les silences détectés
  for (const { start, end } of silences) {
    if (start > cursor) {
      segments.push({ start: cursor, end: start });
    }
    cursor = end;
  }

  // Dernier segment après le dernier silence
  if (cursor < totalDuration) {
    segments.push({ start: cursor, end: totalDuration });
  }

  // On ajoute un petit padding pour ne pas couper trop sec
  const PRE_PAD = 0.15; // 150 ms avant
  const POST_PAD = 0.2; // 200 ms après
  const MIN_SEGMENT = 0.2; // on évite juste les segments ridicules

  const padded = segments
    .map((seg) => {
      let start = seg.start - PRE_PAD;
      let end = seg.end + POST_PAD;

      if (start < 0) start = 0;
      if (end > totalDuration) end = totalDuration;

      return { start, end };
    })
    .filter((seg) => seg.end - seg.start >= MIN_SEGMENT);

  console.log("Segments non silencieux (padded) :", padded);
  return padded;
}

// 5) Extraire chaque segment vidéo + concaténer
async function cutAllNonSilentSegmentsAndConcat(
  inputVideoPath,
  outputVideoPath,
  segments
) {
  const tempDir = path.join(__dirname, "temp_segments");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const segmentFiles = [];

  // 1) Extraire chaque segment
  // 1) Extraire chaque segment
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segPath = path.join(tempDir, `segment_${i}.mp4`);
    segmentFiles.push(segPath);

    // On réencode chaque segment pour éviter les soucis de keyframes / copy
    const cmd = `ffmpeg -y -ss ${seg.start} -to ${seg.end} -i "${inputVideoPath}" \
-c:v libx264 -preset veryfast -crf 23 \
-c:a aac -b:a 128k "${segPath}"`;

    console.log("Commande FFmpeg segment :", cmd);

    await execShell(cmd);
  }

  // 2) Écrire concat.txt proprement
  const concatFilePath = path.join(tempDir, "concat.txt");
  const content = segmentFiles
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");

  await fsPromises.writeFile(concatFilePath, content, "utf8");

  // 3) Concaténer tous les segments
  const cmdConcat = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" \
  -c:v libx264 -preset veryfast -crf 23 \
  -c:a aac -b:a 128k -movflags +faststart "${outputVideoPath}"`;
  
  console.log("Commande FFmpeg concat :", cmdConcat);

  await execShell(cmdConcat);

  console.log("Concaténation terminée avec succès");
}

function execShell(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("Erreur commande shell :", cmd);
        console.error(stderr);
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

// ---------- ROUTE /upload ----------

app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("Fichier reçu :", req.file);

  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const originalPath = req.file.path;

  try {
    // 1) Extension correcte
    let ext = path.extname(req.file.originalname);
    if (!ext) {
      ext = ".mp4";
    }

    const fileWithExtPath = path.join(
      path.dirname(originalPath),
      req.file.filename + ext
    );
    fs.renameSync(originalPath, fileWithExtPath);

    // 2) Dossier processed
    const processedDir = path.join(__dirname, "processed");
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir);
    }

    const processedFileName = req.file.filename + ext;
    const processedPath = path.join(processedDir, processedFileName);

    // 3) Extraire l'audio
    const audioPath = await extractAudio(fileWithExtPath);

    // 4) Durée totale
    const totalDuration = await getMediaDuration(audioPath);

    // 5) Silences
    const silences = await detectSilences(audioPath);

    // 6) Segments non silencieux
    const nonSilentSegments = computeNonSilentSegments(silences, totalDuration);

    if (!nonSilentSegments.length) {
      console.warn(
        "Aucun segment non silencieux détecté, on garde la vidéo telle quelle."
      );
      fs.copyFileSync(fileWithExtPath, processedPath);
    } else {
      // 7) Couper + concat
      await cutAllNonSilentSegmentsAndConcat(
        fileWithExtPath,
        processedPath,
        nonSilentSegments
      );
    }

    const processedVideoUrl = `http://${SERVER_IP}:${port}/processed/${processedFileName}`;

    res.json({
      message: "Vidéo nettoyée : silences début/milieu/fin supprimés",
      processedVideoUrl,
      nonSilentSegments,
    });
  } catch (err) {
    console.error("Erreur traitement :", err);
    res.status(500).json({ error: "Erreur lors du traitement de la vidéo" });
  }
});

// ---------- LANCEMENT ----------

/*app.listen(port, () => {
  console.log(`Serveur backend lancé sur http://localhost:${port}`);
});*/

app.listen(port, "0.0.0.0", () => {
  console.log(`Serveur backend lancé sur http://${SERVER_IP}:${port}`);
});
