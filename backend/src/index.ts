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
// 5. Create an Order (The Bridge between Web3 and Web2)
app.post("/api/orders", async (req: Request, res: Response) => {
  try {
    const { productId, buyerId, transactionHash } = req.body;

    // We use a Prisma Transaction to ensure both database operations succeed or fail together.
    // If marking the item as sold fails, the order won't be created, preventing data corruption.
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Update the product to remove it from the active marketplace
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { isSold: true },
      });

      // 2. Create the official order receipt storing the blockchain hash
      const newOrder = await tx.order.create({
        data: {
          productId,
          buyerId,
          transactionHash,
          status: "COMPLETED", // Funds are secured in the smart contract
        },
      });

      return { updatedProduct, newOrder };
    });

    res.status(201).json({ 
      message: "Order processed and marketplace updated successfully", 
      data: result 
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Failed to process the order." });
  }
});
// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});