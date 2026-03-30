import fs from 'fs';
import path from 'path';

const files = [
  "index.html",
  "package.json",
  "public/manifest.json",
  "server/index.js",
  "server/package.json",
  "src/App.tsx",
  "src/components/ServerStatus.tsx",
  "src/components/UI-wintozo/AuthScreen.tsx",
  "src/components/UI-wintozo/Avatar.tsx",
  "src/components/UI-wintozo/ChatArea.tsx",
  "src/components/UI-wintozo/ChatWindow.tsx",
  "src/components/UI-wintozo/ConnectionError.tsx",
  "src/components/UI-wintozo/DeviceSelect.tsx",
  "src/components/UI-wintozo/EmptyState.tsx",
  "src/components/UI-wintozo/MessengerLayout.tsx",
  "src/components/UI-wintozo/Onboarding.tsx",
  "src/components/UI-wintozo/Sidebar.tsx",
  "src/components/UI-wintozo/SplashScreen.tsx",
  "src/components/UI-wintozo/VerifiedBadge.tsx",
  "src/config/api.ts",
  "src/data/themes.ts",
  "src/hooks/useServerConnection.ts",
  "src/index.css",
  "src/main.tsx",
  "vite.config.ts"
];

async function download() {
  for (const file of files) {
    if (file === "vite.config.ts") continue; // Keep the default vite config or we might break the environment
    try {
      const response = await fetch(`https://raw.githubusercontent.com/neiroset-7373/wintozO_V2/main/${file}`);
      if (!response.ok) {
        console.error(`Failed to download ${file}: ${response.statusText}`);
        continue;
      }
      const content = await response.text();
      
      const dir = path.dirname(file);
      if (dir !== '.') {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(file, content);
      console.log(`Downloaded ${file}`);
    } catch (e) {
      console.error(`Error downloading ${file}:`, e.message);
    }
  }
}

download();
