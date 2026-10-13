import { Router } from "express";
import * as c from "../controllers/claim.controller.js";
export const claimRouter = Router();
claimRouter.get("/", c.listClaims);
claimRouter.post("/", c.createClaim);
claimRouter.patch("/:id", c.updateClaim);
claimRouter.post("/:id/solicitar-envio", c.solicitarEnvio);
claimRouter.post("/:id/comprovante", c.uploadComprovante);
claimRouter.delete("/:id", c.deleteClaim);