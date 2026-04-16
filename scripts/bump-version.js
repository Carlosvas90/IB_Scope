const fs = require("fs");
const path = require("path");

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error("Uso: node scripts/bump-version.js 1.2.7");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");

const targets = [
  {
    file: "package.json",
    update(obj) { obj.version = newVersion; },
  },
  {
    file: "config/config.json",
    update(obj) { obj.version = newVersion; },
  },
  {
    file: "config/update-config.json",
    update(obj) { obj.currentVersion = newVersion; },
  },
  {
    file: "Ejemplos/version.json",
    update(obj) { obj.version = newVersion; },
  },
];

let ok = 0;

for (const { file, update } of targets) {
  const fullPath = path.join(root, file);
  try {
    const obj = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    const oldVer = obj.version || obj.currentVersion;
    update(obj);
    fs.writeFileSync(fullPath, JSON.stringify(obj, null, 2) + "\n", "utf-8");
    console.log(`✅ ${file}: ${oldVer} → ${newVersion}`);
    ok++;
  } catch (e) {
    console.error(`❌ ${file}: ${e.message}`);
  }
}

// package-lock.json: solo las 2 líneas propias, no las de dependencias
const lockPath = path.join(root, "package-lock.json");
try {
  const lockObj = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
  const oldVer = lockObj.version;
  lockObj.version = newVersion;
  if (lockObj.packages && lockObj.packages[""]) {
    lockObj.packages[""].version = newVersion;
  }
  fs.writeFileSync(lockPath, JSON.stringify(lockObj, null, 2) + "\n", "utf-8");
  console.log(`✅ package-lock.json: ${oldVer} → ${newVersion}`);
  ok++;
} catch (e) {
  console.error(`❌ package-lock.json: ${e.message}`);
}

console.log(`\n🎉 ${ok}/5 archivos actualizados a v${newVersion}`);
