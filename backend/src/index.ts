import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg"; 
import { PrismaPg } from "@prisma/adapter-pg"; 
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();

// --- PRISMA CONNECTION ---
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- MIDDLEWARE ---
// Updated CORS to be extra flexible for local development
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json()); 

// --- ROUTES ---

// 1. Health Check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "BlockMart API is running perfectly!" });
});

// 2. GET Products (The missing route!)
app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isSold: false },
      include: { 
        seller: { 
          select: { username: true, walletAddress: true } 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(products);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// 3. Sync User
app.post("/api/users", async (req: Request, res: Response) => {
  try {
    const { walletAddress, username, bio } = req.body;
    let user = await prisma.user.findFirst({ where: { walletAddress } });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress, username, bio },
      });
    }
    res.status(200).json({ message: "User synced", user });
  } catch (error) {
    console.error("User Sync Error:", error);
    res.status(400).json({ error: "Failed to sync user." });
  }
});

// 4. Create Product
app.post("/api/products", async (req: Request, res: Response) => {
  try {
    const { title, description, priceEth, imageUrl, sellerId } = req.body;
    const newProduct = await prisma.product.create({
      data: {
        title,
        description,
        priceEth: parseFloat(priceEth),
        imageUrl,
        sellerId,
      },
    });
    res.status(201).json({ message: "Product listed!", product: newProduct });
  } catch (error) {
    console.error("Prisma Listing Error:", error);
    res.status(400).json({ error: "Failed to list product." });
  }
});

// 5. Create Order
app.post("/api/orders", async (req: Request, res: Response) => {
  try {
    const { productId, buyerId, transactionHash } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { isSold: true },
      });
      const newOrder = await tx.order.create({
        data: { productId, buyerId, transactionHash, status: "COMPLETED" },
      });
      return { updatedProduct, newOrder };
    });
    res.status(201).json({ message: "Order processed", data: result });
  } catch (error) {
    console.error("Order Error:", error);
    res.status(400).json({ error: "Failed to process order." });
  }
});

// --- START SERVER ---
app.listen(5000, "127.0.0.1", () => {
  console.log("🚀 Server is live on http://127.0.0.1:5000");
});