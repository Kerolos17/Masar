import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/user", async (req, res) => {
    const user = await prisma.user.findFirst();
    res.json(user);
  });

  app.post("/api/user", async (req, res) => {
    const { name, role, goal } = req.body;
    const user = await prisma.user.upsert({
      where: { id: 1 },
      update: { name, role, goal },
      create: { id: 1, name, role, goal },
    });
    res.json(user);
  });

  app.get("/api/schedule", async (req, res) => {
    const schedule = await prisma.scheduleBlock.findMany();
    res.json(schedule);
  });

  app.post("/api/schedule", async (req, res) => {
    const blocks = req.body; // Array of blocks
    await prisma.scheduleBlock.deleteMany();
    const created = await prisma.scheduleBlock.createMany({
      data: blocks,
    });
    res.json(created);
  });

  app.get("/api/tasks", async (req, res) => {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const task = await prisma.task.create({
      data: req.body,
    });
    res.json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    await prisma.task.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  });

  app.get("/api/plan90", async (req, res) => {
    const plan = await prisma.plan90.findFirst({
      include: { days: true }
    });
    res.json(plan);
  });

  app.post("/api/plan90", async (req, res) => {
    const { goal, startDate, days } = req.body;
    await prisma.plan90.deleteMany(); // Single plan app
    const plan = await prisma.plan90.create({
      data: {
        goal,
        startDate,
        days: {
          create: days
        }
      },
      include: { days: true }
    });
    res.json(plan);
  });

  app.delete("/api/plan90", async (req, res) => {
    await prisma.plan90.deleteMany();
    res.json({ success: true });
  });

  app.get("/api/messages", async (req, res) => {
    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const message = await prisma.chatMessage.create({
      data: req.body,
    });
    res.json(message);
  });

  app.post("/api/danger-zone/reset", async (req, res) => {
    await prisma.task.deleteMany();
    await prisma.plan90.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.scheduleBlock.deleteMany();
    await prisma.user.deleteMany();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
