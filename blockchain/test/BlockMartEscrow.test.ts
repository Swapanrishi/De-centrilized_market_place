import { describe, it } from "node:test";
import assert from "node:assert";
import hre from "hardhat";
import { parseEther } from "viem";

// Force TypeScript to ignore the strict checking for the Hardhat environment
const hardhat: any = hre;

describe("BlockMartEscrow", () => {
    
    async function deployEscrowFixture() {
        // HARDHAT 3 SYNTAX: Connect to the network to get the viem object
        const { viem } = await hardhat.network.connect();

        const [buyer, seller] = await viem.getWalletClients();
        const escrow = await viem.deployContract("BlockMartEscrow");
        const publicClient = await viem.getPublicClient();
        
        return { escrow, buyer, seller, publicClient };
    }

    it("should successfully lock funds when an order is created", async () => {
        const { escrow, buyer, seller, publicClient } = await deployEscrowFixture();

        const mockProductId = "postgres-uuid-1234";
        const purchaseAmount = parseEther("1"); // 1 ETH

        // 1. The buyer triggers the 'createOrder' function and sends 1 ETH
        const txHash = await escrow.write.createOrder(
            [mockProductId, seller.account.address], 
            {
                value: purchaseAmount,
                account: buyer.account,
            }
        );
        
        // Wait for the transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        // 2. Read the newly created order from the blockchain (Order ID 1)
        const order = await escrow.read.orders([1n]);

        // 3. Verify the data matches exactly what we sent
        assert.strictEqual(order[0], 1n); 
        assert.strictEqual(order[1], mockProductId); 
        assert.strictEqual(order[2].toLowerCase(), buyer.account.address.toLowerCase()); 
        assert.strictEqual(order[3].toLowerCase(), seller.account.address.toLowerCase()); 
        assert.strictEqual(order[4], purchaseAmount); 
        assert.strictEqual(order[5], 0); // State 0 = Locked
    });
});