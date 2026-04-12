🌐 BlockMart: Decentralized Online Marketplace & Exchange
BlockMart is a hybrid decentralized application (dApp) that bridges traditional e-commerce with blockchain settlement. It provides a secure, trustless environment for users to list, trade, and purchase physical or digital assets using cryptocurrency, while maintaining a lightning-fast user experience through an off-chain relational database for metadata.

✨ Key Features
Trustless Transactions: All payments and asset transfers are handled entirely via audited Solidity smart contracts.

Hybrid Architecture: Heavy metadata (product images, descriptions, user reviews) is stored off-chain to minimize gas fees and optimize search performance.

Wallet Integration: Seamless connection with Web3 wallets (MetaMask, WalletConnect) using Ethers.js.

Escrow Mechanism: Smart contracts hold funds in escrow until the buyer confirms receipt of the goods, ensuring protection for both parties.

Responsive UI: A clean, modern frontend built with React for an intuitive shopping and trading experience.

🏗️ Technical Architecture
This project utilizes a hybrid Web2/Web3 architecture to balance decentralization with performance:

Frontend: React.js, Tailwind CSS, Ethers.js

Backend (Off-Chain): Node.js, Express.js

Database & ORM: PostgreSQL managed via Prisma

Blockchain (On-Chain): Solidity Smart Contracts deployed on the Ethereum (Sepolia) testnet

Containerization: Docker (for local database and backend environment)
