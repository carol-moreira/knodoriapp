// =====================================================================
// Controller: CEG UNIDADE (Claim por joiner)
// =====================================================================
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function listClaims(req, res) {
  const { cegId, joinerId } = req.query;
  const claims = await prisma.cegUnidade.findMany({
    where: { cegId: cegId || undefined, joinerId: joinerId || undefined },
    include: { ceg: true, joiner: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(claims);
}

export async function createClaim(req, res) {
  // ⚠️ LÓGICA DE NEGÓCIO:
  //  - verificar se ainda há vagas na CEG
  //  - incrementar CegGeral.qtdItens
  const claim = await prisma.cegUnidade.create({ data: req.body });
  await prisma.cegGeral.update({
    where: { id: claim.cegId },
    data: { qtdItens: { increment: 1 } },
  });
  res.status(201).json(claim);
}

export async function updateClaim(req, res) {
  // ⚠️ LÓGICA DE NEGÓCIO:
  //  - se pagamentoStatus mudar para PAGO → registrar data
  //  - se prazo vencido e ainda PENDENTE → aplicar taxaAtraso
  const claim = await prisma.cegUnidade.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(claim);
}

export async function solicitarEnvio(req, res) {
  const { cep, endereco } = req.body;
  const claim = await prisma.cegUnidade.update({
    where: { id: req.params.id },
    data: { cep, endereco, envioStatus: "PRONTO_ENVIO" },
  });
  res.json(claim);
}

export async function uploadComprovante(req, res) {
  // ⚠️ Aqui você integra com S3/Supabase Storage e salva URL
  const { arquivoUrl, valor } = req.body;
  const proof = await prisma.paymentProof.create({
    data: {
      userId: req.user.id,
      contexto: `claim:${req.params.id}`,
      arquivoUrl,
      valor,
    },
  });
  res.status(201).json(proof);
}

export async function deleteClaim(req, res) {
  await prisma.cegUnidade.delete({ where: { id: req.params.id } });
  res.status(204).end();
}