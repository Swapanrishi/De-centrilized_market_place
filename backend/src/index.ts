import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg"; // <-- NEW
import { PrismaPg } from "@prisma/adapter-pg"; // <-- NEW
import { PrismaClient } from "@prisma/client";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// PRISMA 7 CONNECTION SETUP
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Middleware
app.use(cors());
app.use(express.json()); 

// 1. Health Check Route
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "BlockMart API is running perfectly!" });
});

// 2. Test Route: Create a new User in Neon
app.post("/api/users", async (req: Request, res: Response) => {
  try {
    const { walletAddress, username, bio } = req.body;

    const newUser = await prisma.user.create({
      data: {
        walletAddress,
        username,
        bio,
      },
    });

    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Failed to create user." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});