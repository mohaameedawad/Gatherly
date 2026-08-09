import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { store } from "../db/store.js";
export const adminRouter = Router();
adminRouter.use(authenticate, authorize("ADMIN"));
adminRouter.get("/users", (_, res) =>
  res.json(store.users().map(({ passwordHash, ...u }) => u)),
);
adminRouter.patch("/users/:id/toggle", (req, res) => {
  const u = store.toggleUser(+req.params.id);
  if (!u) return res.status(404).json({ message: "User not found" });
  const { passwordHash, ...safe } = u;
  res.json(safe);
});
