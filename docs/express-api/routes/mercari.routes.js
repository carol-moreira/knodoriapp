import { Router } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const mercariRouter = Router();

// Wishlist
mercariRouter.get("/wishlist/:userId", async (req, res) => {
  res.json(await prisma.mercariWishlistItem.findMany({
    where: { userId: req.params.userId }, orderBy: { createdAt: "desc" },
  }));
});
mercariRouter.post("/wishlist", async (req, res) => {
  res.status(201).json(await prisma.mercariWishlistItem.create({ data: req.body }));
});

// Solicitação de compra
mercariRouter.post("/requests", async (req, res) => {
  // ⚠️ Lógica: converter valorJpy → valorBrl usando cotação atual
  res.status(201).json(await prisma.mercariRequest.create({ data: req.body }));
});

// Vitrine de itens comprados
mercariRouter.get("/showcase", async (_req, res) => {
  res.json(await prisma.mercariRequest.findMany({
    where: { status: { in: ["COMPRADO", "ENTREGUE"] } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  }));
});