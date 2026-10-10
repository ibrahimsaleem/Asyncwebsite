import { Router, type IRouter, type Request } from "express";
import multer from "multer";
import { db, uploadedFilesTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  DeleteFileParams,
  ListFilesResponse,
  UploadFileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Kept in memory, then stored in the database (see the schema for why not on disk)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Everything except the file contents, so listing stays light
const listColumns = {
  id: uploadedFilesTable.id,
  clientId: uploadedFilesTable.clientId,
  projectId: uploadedFilesTable.projectId,
  fileName: uploadedFilesTable.fileName,
  size: uploadedFilesTable.size,
  uploadedBy: uploadedFilesTable.uploadedBy,
  uploadedAt: uploadedFilesTable.uploadedAt,
};
type FileRow = { id: number; clientId: number; projectId: number | null; fileName: string; size: number | null; uploadedBy: string; uploadedAt: Date };

function formatFile(f: FileRow) {
  return {
    id: f.id,
    clientId: f.clientId,
    projectId: f.projectId ?? null,
    fileName: f.fileName,
    filePath: `/api/files/${f.id}/download`,
    uploadedAt: f.uploadedAt.toISOString(),
    size: f.size ?? null,
    uploadedBy: f.uploadedBy,
  };
}

async function myClientId(req: Request) {
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
  return client?.id ?? null;
}

router.get("/files", requireAuth, async (req, res): Promise<void> => {
  let files: FileRow[];
  if (req.session.userRole === "admin") {
    files = await db.select(listColumns).from(uploadedFilesTable);
  } else {
    const clientId = await myClientId(req);
    if (!clientId) {
      res.json([]);
      return;
    }
    files = await db.select(listColumns).from(uploadedFilesTable).where(eq(uploadedFilesTable.clientId, clientId));
  }
  res.json(ListFilesResponse.parse(files.map(formatFile)));
});

// multipart/form-data: "file", plus "clientId" when an admin uploads for a client
router.post("/files", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }
  const isAdmin = req.session.userRole === "admin";
  const clientId = isAdmin ? parseInt(String(req.body.clientId), 10) : await myClientId(req);
  if (!clientId || Number.isNaN(clientId)) {
    res.status(isAdmin ? 400 : 403).json({ error: isAdmin ? "Choose which client this file is for" : "No client profile found" });
    return;
  }
  if (isAdmin) {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client) {
      res.status(400).json({ error: "Client not found" });
      return;
    }
  }
  const projectId = req.body.projectId ? parseInt(String(req.body.projectId), 10) : null;

  const [file] = await db.insert(uploadedFilesTable).values({
    clientId,
    projectId,
    fileName: req.file.originalname.slice(0, 200),
    filePath: "",
    data: req.file.buffer,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: isAdmin ? "admin" : "client",
  }).returning(listColumns);

  res.status(201).json(UploadFileResponse.parse(formatFile(file)));
});

// Only the owning client or an admin can download. Always sent as an attachment so a file
// can never run as a page on our domain.
router.get("/files/:id/download", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [file] = await db.select().from(uploadedFilesTable).where(eq(uploadedFilesTable.id, id));
  if (!file || !file.data) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  if (req.session.userRole !== "admin" && (await myClientId(req)) !== file.clientId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.send(file.data);
});

router.delete("/files/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [file] = await db.select(listColumns).from(uploadedFilesTable).where(eq(uploadedFilesTable.id, params.data.id));
  if (!file) {
    res.sendStatus(204);
    return;
  }
  // Clients may only delete files they uploaded themselves
  if (req.session.userRole !== "admin" && ((await myClientId(req)) !== file.clientId || file.uploadedBy === "admin")) {
    res.status(403).json({ error: "Only files you uploaded can be removed" });
    return;
  }
  await db.delete(uploadedFilesTable).where(eq(uploadedFilesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
