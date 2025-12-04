// services/whisperService.js
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function transcribeWithWhisperVerbose(filePath) {
  console.log('Transcription Whisper verbose_json en cours...');

  const fileStream = fs.createReadStream(filePath);

  const response = await openai.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-1',
    response_format: 'verbose_json',
    // language: 'fr', // optionnel
  });

  console.log('Transcription terminée');
  return response; // { text, segments: [...] }
}

// ---- Helpers pour SRT ----

/**
 * Divise les segments longs en segments plus courts pour un affichage plus lisible
 * @param {Array} segments - Segments Whisper originaux
 * @param {number} maxCharsPerSegment - Nombre maximum de caractères par segment (défaut: 40)
 * @param {number} maxDurationPerSegment - Durée maximum par segment en secondes (défaut: 3)
 */
function splitLongSegments(segments, maxCharsPerSegment = 40, maxDurationPerSegment = 3) {
  if (!segments || !segments.length) return [];

  const splitSegments = [];

  segments.forEach((segment) => {
    const text = segment.text.trim();
    const duration = segment.end - segment.start;

    // Si le segment est court, on le garde tel quel
    if (text.length <= maxCharsPerSegment && duration <= maxDurationPerSegment) {
      splitSegments.push(segment);
      return;
    }

    // Diviser le texte en phrases ou mots
    // On divise sur les ponctuations et espaces
    const words = text.split(/([.,!?;:]\s*|\s+)/);
    const chunks = [];
    let currentChunk = '';

    words.forEach((word) => {
      if ((currentChunk + word).length <= maxCharsPerSegment) {
        currentChunk += word;
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = word;
      }
    });

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Si on n'a qu'un seul chunk (texte trop long sans ponctuation), on divise par nombre de caractères
    if (chunks.length === 0 || (chunks.length === 1 && chunks[0].length > maxCharsPerSegment)) {
      chunks.length = 0;
      for (let i = 0; i < text.length; i += maxCharsPerSegment) {
        const chunk = text.substring(i, i + maxCharsPerSegment).trim();
        if (chunk) {
          chunks.push(chunk);
        }
      }
    }

    // Créer des segments avec des timestamps proportionnels
    if (chunks.length > 0) {
      const chunkDuration = duration / chunks.length;
      chunks.forEach((chunk, index) => {
        if (chunk) {
          splitSegments.push({
            start: segment.start + (index * chunkDuration),
            end: segment.start + ((index + 1) * chunkDuration),
            text: chunk,
          });
        }
      });
    } else {
      // Fallback : garder le segment original si on n'a pas pu le diviser
      splitSegments.push(segment);
    }
  });

  return splitSegments;
}

// 10.123 -> "00:00:10,123"
function formatTimeSrt(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(secs).padStart(2, '0');
  const msStr = String(ms).padStart(3, '0');

  return `${h}:${m}:${s},${msStr}`;
}

function buildSrtFromSegments(segments) {
  if (!segments || !segments.length) return '';

  const lines = segments.map((seg, index) => {
    const start = formatTimeSrt(seg.start);
    const end = formatTimeSrt(seg.end);
    const text = (seg.text || '').trim();

    // Format SRT : numéro, timestamps, texte, puis ligne vide
    return `${index + 1}\n${start} --> ${end}\n${text}`;
  });

  // Joindre avec double saut de ligne pour avoir une ligne vide entre chaque bloc
  return lines.join('\n\n') + '\n';
}

async function writeSrtFile(segments, baseFileName) {
  const subtitlesDir = path.join(__dirname, '..', 'subtitles');
  if (!fs.existsSync(subtitlesDir)) {
    fs.mkdirSync(subtitlesDir);
  }

  // Diviser les segments longs en segments plus courts
  const shortSegments = splitLongSegments(segments, 40, 3); // 40 caractères max, 3 secondes max

  const srtFileName = baseFileName + '.srt';
  const srtPath = path.join(subtitlesDir, srtFileName);

  const srtContent = buildSrtFromSegments(shortSegments);
  await fsPromises.writeFile(srtPath, srtContent, 'utf8');

  console.log('Fichier SRT généré :', srtPath);
  console.log(`Segments originaux: ${segments.length}, Segments après division: ${shortSegments.length}`);
  
  return { srtPath, srtFileName, segments: shortSegments };
}

module.exports = {
  transcribeWithWhisperVerbose,
  buildSrtFromSegments,
  writeSrtFile,
  splitLongSegments,
};
