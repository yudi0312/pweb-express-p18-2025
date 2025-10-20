import dotenv from "dotenv";
dotenv.config(); // supaya bisa baca file .env

import app from "./app";
import prisma from "./prisma";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// tutup koneksi prisma saat server dihentikan
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
