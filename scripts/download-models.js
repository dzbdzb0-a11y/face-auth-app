const https = require("https");
const fs = require("fs");
const path = require("path");

const MODELS_DIR = path.join(__dirname, "..", "public", "models");
const BASE_URL =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const MODEL_FILES = [
  "tiny_face_detector_model-shard1",
  "tiny_face_detector_model-weights_manifest.json",
  "face_landmark_68_tiny_model-shard1",
  "face_landmark_68_tiny_model-weights_manifest.json",
  // 128차원 얼굴 특징 벡터 추출 (ResNet-34, ~6.2MB × 2 shards)
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
  "face_recognition_model-weights_manifest.json",
];

function download(filename) {
  return new Promise((resolve, reject) => {
    const dest = path.join(MODELS_DIR, filename);
    if (fs.existsSync(dest)) {
      console.log(`  ✓ ${filename} (cached)`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(dest);

    function get(url) {
      https
        .get(url, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            file.close();
            get(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${filename}`));
            return;
          }
          res.pipe(file);
          file.on("finish", () => file.close(resolve));
        })
        .on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    }

    get(`${BASE_URL}/${filename}`);
  });
}

async function main() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log("Downloading face-api.js models...\n");
  for (const file of MODEL_FILES) {
    process.stdout.write(`  Downloading ${file}...`);
    await download(file);
    process.stdout.write(" ✓\n");
  }
  console.log("\nAll models ready! ✓");
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
