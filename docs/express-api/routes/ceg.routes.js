import { Router } from "express";
import * as c from "../controllers/ceg.controller.js";
export const cegRouter = Router();
cegRouter.get("/", c.listCegs);
cegRouter.get("/:id", c.getCeg);
cegRouter.post("/", c.createCeg);
cegRouter.patch("/:id", c.updateCeg);
cegRouter.post("/:id/ratear", c.ratearCustos);
cegRouter.delete("/:id", c.deleteCeg);