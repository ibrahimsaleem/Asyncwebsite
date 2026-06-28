import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, uploadedFilesTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  DeleteFileParams,
  ListFilesResponse,
  UploadFileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function formatFile(f: typeof uploadedFilesTable.$inferSelect) {
  return {
    id: f.id,
    clientId: f.clientId,
    projectId: f.projectId ?? null,
    fileName: f.fileName,
    filePath: f.filePath,
    uploadedAt: f.uploadedAt.toISOString(),
  };
}

router.get("/files", requireAuth, async (req, res): Promise<void> => {
  let files: typeof uploadedFilesTable.$inferSelect[];

  if (req.session.userRole === "admin") {
    files = await db.select().from(uploadedFilesTable);
  } else {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!client) {
      res.json([]);
      return;
    }
    files = await db.select().from(uploadedFilesTable).where(eq(uploadedFilesTable.clientId, client.id));
  }

  res.json(ListFilesResponse.parse(files.map(formatFile)));
});

// Handle multipart uploads via multer — the OpenAPI spec uses JSON body for typing,
// but the actual endpoint accepts multipart/form-data
router.post("/files", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
  if (!client && req.session.userRole !== "admin") {
    res.status(403).json({ error: "No client profile found" });
    return;
  }

  const rawClientId = client?.id ?? parseInt(req.body.clientId as string, 10);
  if (!rawClientId || Number.isNaN(rawClientId)) {
    res.status(400).json({ error: "clientId is required" });
    return;
  }
  const clientId = rawClientId;
  const projectId = req.body.projectId ? parseInt(req.body.projectId as string, 10) : null;

  let fileName: string;
  let filePath: string;

  if (req.file) {
    fileName = req.file.originalname;
    filePath = `/api/uploads/${req.file.filename}`;
  } else if (req.body.fileName) {
    fileName = req.body.fileName as string;
    filePath = `/api/uploads/${fileName}`;
  } else {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const [file] = await db
    .insert(uploadedFilesTable)
    .values({ clientId, projectId, fileName, filePath })
    .returning();

  res.status(201).json(UploadFileResponse.parse(formatFile(file)));
});

router.delete("/files/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [file] = await db.select().from(uploadedFilesTable).where(eq(uploadedFilesTable.id, params.data.id));
  if (!file) {
    res.sendStatus(204);
    return;
  }

  // Non-admins may only delete their own files
  if (req.session.userRole !== "admin") {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!client || client.id !== file.clientId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  const diskPath = path.resolve(uploadsDir, path.basename(file.filePath));
  if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
  await db.delete(uploadedFilesTable).where(eq(uploadedFilesTable.id, params.data.id));

  res.sendStatus(204);
});

export default router;
