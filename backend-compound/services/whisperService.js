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

    return `${index + 1}\n${start} --> ${end}\n${text}\n`;
  });

  return lines.join('\n'); // ligne vide entre chaque bloc
}

async function writeSrtFile(segments, baseFileName) {
  const subtitlesDir = path.join(__dirname, '..', 'subtitles');
  if (!fs.existsSync(subtitlesDir)) {
    fs.mkdirSync(subtitlesDir);
  }

  const srtFileName = baseFileName + '.srt';
  const srtPath = path.join(subtitlesDir, srtFileName);

  const srtContent = buildSrtFromSegments(segments);
  await fsPromises.writeFile(srtPath, srtContent, 'utf8');

  console.log('Fichier SRT généré :', srtPath);
  return { srtPath, srtFileName };
}

module.exports = {
  transcribeWithWhisperVerbose,
  buildSrtFromSegments,
  writeSrtFile,
};
