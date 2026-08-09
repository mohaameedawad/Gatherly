import "dotenv/config";
import { mkdirSync } from "node:fs";
mkdirSync("./data", { recursive: true });
const { app } = await import("./app.js");
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () =>
  console.log(`Gatherly API listening on http://localhost:${port}`),
);
