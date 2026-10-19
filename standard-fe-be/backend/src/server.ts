import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/api";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
  })
);

// Mount API routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`[Standard BE] Server running on http://localhost:${PORT}`);
});
