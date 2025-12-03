// services/ffmpegService.js
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const fsPromises = require('fs').promises;

function execShell(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error('Erreur commande shell :', cmd);
        console.error(stderr);
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

function extractAudio(inputVideoPath) {
  return new Promise((resolve, reject) => {
    const audioDir = path.join(__dirname, '..', 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir);
    }

    const baseName = path.basename(inputVideoPath, path.extname(inputVideoPath));
    const audioPath = path.join(audioDir, baseName + '.wav');

    const cmd = `ffmpeg -y -i "${inputVideoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`;
    console.log('Commande FFmpeg audio :', cmd);

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Erreur FFmpeg audio :', error);
        console.error('stderr :', stderr);
        return reject(error);
      }
      console.log('Extraction audio terminée :', audioPath);
      resolve(audioPath);
    });
  });
}

function getMediaDuration(filePath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "${filePath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Erreur ffprobe :', error);
        return reject(error);
      }
      const duration = parseFloat(stdout.trim());
      console.log('Durée media :', duration, 's');
      resolve(duration);
    });
  });
}

function detectSilences(audioPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -i "${audioPath}" -af silencedetect=noise=-32dB:d=0.6 -f null -`;

    console.log('Commande FFmpeg silencedetect :', cmd);

    exec(cmd, (error, stdout, stderr) => {
      const lines = stderr.split('\n');
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

      console.log('Silences détectés :', silences);
      resolve(silences);
    });
  });
}

function computeNonSilentSegments(silences, totalDuration) {
  const segments = [];
  let cursor = 0;

  for (const { start, end } of silences) {
    if (start > cursor) {
      segments.push({ start: cursor, end: start });
    }
    cursor = end;
  }

  if (cursor < totalDuration) {
    segments.push({ start: cursor, end: totalDuration });
  }

  const PRE_PAD = 0.3;
  const POST_PAD = 0.4;
  const MIN_SEGMENT = 0.3;

  let padded = segments
    .map(seg => {
      let start = seg.start - PRE_PAD;
      let end = seg.end + POST_PAD;

      if (start < 0) start = 0;
      if (end > totalDuration) end = totalDuration;

      return { start, end };
    })
    .filter(seg => seg.end - seg.start >= MIN_SEGMENT);

  const GAP_MERGE = 0.5;

  padded.sort((a, b) => a.start - b.start);

  const merged = [];
  for (const seg of padded) {
    if (!merged.length) {
      merged.push({ ...seg });
      continue;
    }
    const last = merged[merged.length - 1];

    if (seg.start <= last.end + GAP_MERGE) {
      last.end = Math.max(last.end, seg.end);
    } else {
      merged.push({ ...seg });
    }
  }

  console.log('Segments non silencieux (padded + merged) :', merged);
  return merged;
}

async function cutAllNonSilentSegmentsAndConcat(inputVideoPath, outputVideoPath, segments) {
  const tempDir = path.join(__dirname, '..', 'temp_segments');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const segmentFiles = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segPath = path.join(tempDir, `segment_${i}.mp4`);
    segmentFiles.push(segPath);

    const cmd = `ffmpeg -y -ss ${seg.start} -to ${seg.end} -i "${inputVideoPath}" \
-c:v libx264 -preset veryfast -crf 23 \
-c:a aac -b:a 128k "${segPath}"`;

    console.log('Commande FFmpeg segment :', cmd);
    await execShell(cmd);
  }

  const concatFilePath = path.join(tempDir, 'concat.txt');
  const content = segmentFiles
    .map(p => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n');

  await fsPromises.writeFile(concatFilePath, content, 'utf8');

  const cmdConcat = `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" \
-c:v libx264 -preset veryfast -crf 23 \
-c:a aac -b:a 128k -movflags +faststart "${outputVideoPath}"`;
  console.log('Commande FFmpeg concat :', cmdConcat);

  await execShell(cmdConcat);
  console.log('Concaténation terminée avec succès');
}

module.exports = {
  extractAudio,
  getMediaDuration,
  detectSilences,
  computeNonSilentSegments,
  cutAllNonSilentSegmentsAndConcat,
};
