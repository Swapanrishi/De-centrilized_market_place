"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const app = (0, express_1.default)();
// --- PRISMA CONNECTION ---
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
// --- MIDDLEWARE ---
// Updated CORS to be extra flexible for local development
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express_1.default.json());
// --- ROUTES ---
// 1. Health Check
app.get("/health", (req, res) => {
    res.status(200).json({ status: "BlockMart API is running perfectly!" });
});
// 2. GET Products (The missing route!)
app.get("/api/products", async (req, res) => {
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
    }
    catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});
// 3. Sync User
app.post("/api/users", async (req, res) => {
    try {
        const { walletAddress, username, bio } = req.body;
        let user = await prisma.user.findFirst({ where: { walletAddress } });
        if (!user) {
            user = await prisma.user.create({
                data: { walletAddress, username, bio },
            });
        }
        res.status(200).json({ message: "User synced", user });
    }
    catch (error) {
        console.error("User Sync Error:", error);
        res.status(400).json({ error: "Failed to sync user." });
    }
});
// 4. Create Product
app.post("/api/products", async (req, res) => {
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
    }
    catch (error) {
        console.error("Prisma Listing Error:", error);
        res.status(400).json({ error: "Failed to list product." });
    }
});
// 5. Create Order
app.post("/api/orders", async (req, res) => {
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
    }
    catch (error) {
        console.error("Order Error:", error);
        res.status(400).json({ error: "Failed to process order." });
    }
});
// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is live on port ${PORT}`);
});
