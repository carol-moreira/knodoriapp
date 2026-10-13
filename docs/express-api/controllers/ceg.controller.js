// =====================================================================
// Controller: CEG GERAL (Admin)
// Toda a lógica de negócio principal deve viver aqui (cálculos de
// rateio, conversão moeda, atualização de status logístico, etc.)
// =====================================================================
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// LISTAR todas as CEGs (com contagem de claims)
export async function listCegs(req, res) {
  const cegs = await prisma.cegGeral.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { unidades: true } } },
  });
  res.json(cegs);
}

// DETALHE de uma CEG (com unidades + joiners)
export async function getCeg(req, res) {
  const ceg = await prisma.cegGeral.findUnique({
    where: { id: req.params.id },
    include: { unidades: { include: { joiner: true } } },
  });
  if (!ceg) return res.status(404).json({ error: "CEG não encontrada" });
  res.json(ceg);
}

// CRIAR nova CEG
export async function createCeg(req, res) {
  // ⚠️ LÓGICA DE NEGÓCIO:
  //  - validar moeda + cotação
  //  - validar campos obrigatórios
  const ceg = await prisma.cegGeral.create({ data: req.body });
  res.status(201).json(ceg);
}

// ATUALIZAR (status, datas, rastreios, custos de importação)
export async function updateCeg(req, res) {
  // ⚠️ LÓGICA DE NEGÓCIO:
  //  - quando "dataChegadaBR" é setada → status = CHEGOU_BR
  //  - quando "impostoRF" é setado → recalcular rateio entre claims
  const ceg = await prisma.cegGeral.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(ceg);
}

// RATEIO automático de custos extras (frete BR + RF + embalagem)
// entre as unidades proporcional ao valor do item.
export async function ratearCustos(req, res) {
  const cegId = req.params.id;
  const ceg = await prisma.cegGeral.findUnique({
    where: { id: cegId },
    include: { unidades: true },
  });
  if (!ceg) return res.status(404).json({ error: "CEG não encontrada" });

  const totalExtras =
    Number(ceg.valorFreteBR ?? 0) +
    Number(ceg.impostoRF ?? 0) +
    Number(ceg.custoEmbalagem ?? 0);

  const somaItens = ceg.unidades.reduce((s, u) => s + Number(u.valor), 0) || 1;

  await prisma.$transaction(
    ceg.unidades.map((u) => {
      const peso = Number(u.valor) / somaItens;
      const freteUnit = totalExtras * peso;
      return prisma.cegUnidade.update({
        where: { id: u.id },
        data: { freteInterUnidade: freteUnit },
      });
    }),
  );

  res.json({ ok: true, rateadoEntre: ceg.unidades.length, totalExtras });
}

// REMOVER
export async function deleteCeg(req, res) {
  await prisma.cegGeral.delete({ where: { id: req.params.id } });
  res.status(204).end();
}