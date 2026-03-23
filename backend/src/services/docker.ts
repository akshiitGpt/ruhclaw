import { $ } from "bun";

const IMAGE_NAME = "ruhclaw-openclaw";
const GATEWAY_PORT = 18790;
const WATCHER_PORT = 18791;
const PREVIEW_PORT = 18792;

let nextPort = 19000;

export interface ContainerInfo {
  containerId: string;
  gatewayUrl: string;
  gatewayToken: string;
  hostPort: number;
  fileWatcherPort: number;
  previewPort: number;
}

export async function ensureImage(): Promise<void> {
  const check =
    await $`docker image inspect ${IMAGE_NAME} 2>/dev/null`.quiet().nothrow();
  if (check.exitCode === 0) return;

  console.log(`[docker] Building image ${IMAGE_NAME}...`);
  const dockerDir = new URL("../../docker", import.meta.url).pathname;
  await $`docker build -t ${IMAGE_NAME} ${dockerDir}`.quiet();
  console.log(`[docker] Image built.`);
}

export async function createContainer(): Promise<ContainerInfo> {
  await ensureImage();

  const hostPort = nextPort;
  const fileWatcherPort = nextPort + 1;
  const previewPort = nextPort + 2;
  nextPort += 3;

  const token = crypto.randomUUID();
  const openrouterKey = process.env.OPENROUTER_API_KEY || "";

  console.log(`[docker] Creating container (gw:${hostPort}, watch:${fileWatcherPort}, preview:${previewPort})...`);

  const result =
    await $`docker run -dt --name ruhclaw-agent-${hostPort} -p ${hostPort}:${GATEWAY_PORT} -p ${fileWatcherPort}:${WATCHER_PORT} -p ${previewPort}:${PREVIEW_PORT} -e OPENCLAW_GATEWAY_TOKEN=${token} -e OPENROUTER_API_KEY=${openrouterKey} -e OPENCLAW_MODEL=${process.env.OPENCLAW_MODEL || "anthropic/claude-sonnet-4"} --memory=2g --cpus=1 ${IMAGE_NAME}`.quiet();

  const containerId = result.text().trim();
  const gatewayUrl = `http://localhost:${hostPort}`;

  console.log(`[docker] Container started: ${containerId.slice(0, 12)}`);

  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await fetch(gatewayUrl, { signal: AbortSignal.timeout(2000) });
      console.log(`[docker] Gateway ready at ${gatewayUrl} (check ${i + 1})`);
      return { containerId, gatewayUrl, gatewayToken: token, hostPort, fileWatcherPort, previewPort };
    } catch {}

    if (i % 5 === 4) {
      const status =
        await $`docker inspect -f '{{.State.Running}}' ${containerId} 2>/dev/null`
          .quiet().nothrow();
      if (status.text().trim() !== "true") {
        const logs = await $`docker logs --tail 20 ${containerId} 2>&1`.quiet().nothrow();
        console.error(`[docker] Container died:\n${logs.text()}`);
        throw new Error("OpenClaw container exited");
      }
      console.log(`[docker] Still waiting... (check ${i + 1})`);
    }
  }

  throw new Error("OpenClaw gateway failed to start within timeout");
}

export async function execInContainer(containerId: string, cmd: string): Promise<string> {
  const result = await $`docker exec ${containerId} bash -c ${cmd}`.quiet().nothrow();
  return result.text();
}

export async function removeContainer(containerId: string): Promise<void> {
  await $`docker rm -f ${containerId}`.quiet().nothrow();
}
