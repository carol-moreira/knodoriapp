// =====================================================================
// PASSO 2 — Estrutura básica da API Node.js (Express)
// Pronto para deploy (Railway / Render / Fly / etc.)
// =====================================================================
import express from "express";
import cors from "cors";
import { cegRouter } from "./routes/ceg.routes.js";
import { claimRouter } from "./routes/claim.routes.js";
import { mercariRouter } from "./routes/mercari.routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// rotas principais
app.use("/api/cegs", cegRouter);          // CEG Geral (ADM)
app.use("/api/claims", claimRouter);      // CEG Unidade
app.use("/api/mercari", mercariRouter);   // Portal Joiner - Mercari

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`🍒 API CEG rodando em :${PORT}`));
