import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const DEFAULT_STATE = {
  nextAccountId: 1,
  nextOtpId: 1,
  nextRefreshId: 1,
  accounts: [],
  otpCodes: [],
  refreshTokens: [],
};

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
    return structuredClone(DEFAULT_STATE);
  }

  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
}

// Mock DB: everything lives in-memory for the life of the process and is
// mirrored to a JSON file on disk so state survives a restart. Writes are
// chained through one promise so concurrent requests can't interleave and
// corrupt the file.
const state = load();
let writeQueue = Promise.resolve();

export function getState() {
  return state;
}

export function save() {
  writeQueue = writeQueue.then(() => fs.promises.writeFile(DATA_FILE, JSON.stringify(state, null, 2)));
  return writeQueue;
}
