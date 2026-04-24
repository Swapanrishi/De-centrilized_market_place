// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BlockMartEscrow {
    // Defines the possible states of a transaction
    enum EscrowState { Locked, Released, Refunded }

    struct Order {
        uint256 orderId;
        string productId; // Links to your off-chain PostgreSQL database
        address payable buyer;
        address payable seller;
        uint256 amount;
        EscrowState state;
    }

    uint256 public orderCount = 0;
    mapping(uint256 => Order) public orders;

    // Events for your Node.js backend to listen to
    event OrderCreated(uint256 indexed orderId, string productId, address buyer, address seller, uint256 amount);
    event FundsReleased(uint256 indexed orderId);
    event FundsRefunded(uint256 indexed orderId);

    // 1. Buyer initiates the purchase and sends ETH to the contract
    function createOrder(string memory _productId, address payable _seller) public payable {
        require(msg.value > 0, "Payment must be greater than 0");
        require(msg.sender != _seller, "Seller cannot buy their own item");

        orderCount++;
        
        orders[orderCount] = Order(
            orderCount,
            _productId,
            payable(msg.sender),
            _seller,
            msg.value,
            EscrowState.Locked
        );

        emit OrderCreated(orderCount, _productId, msg.sender, _seller, msg.value);
    }

    // 2. Buyer confirms receipt of goods, releasing funds to the seller
    function confirmDelivery(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only the buyer can confirm delivery");
        require(order.state == EscrowState.Locked, "Order is not locked in escrow");

        order.state = EscrowState.Released;
        
        // Transfer the held funds to the seller
        (bool success, ) = order.seller.call{value: order.amount}("");
        require(success, "Transfer to seller failed");

        emit FundsReleased(_orderId);
    }

    // 3. Seller cancels the order, refunding the buyer
    function refundBuyer(uint256 _orderId) public {
        Order storage order = orders[_orderId];
        require(msg.sender == order.seller, "Only the seller can issue a refund");
        require(order.state == EscrowState.Locked, "Order is not locked in escrow");

        order.state = EscrowState.Refunded;

        // Transfer the held funds back to the buyer
        (bool success, ) = order.buyer.call{value: order.amount}("");
        require(success, "Refund to buyer failed");

        emit FundsRefunded(_orderId);
    }
}