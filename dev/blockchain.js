const sha256 = require('sha256');
const uuid = require('uuid').v1;
const process = require('process');

const currentNodeUrl = process.argv[3];

function Blockchain() {
    this.chain = [];

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];

    // new transactions before they are placed into the chain
    this.pendingTransactions = [];

    // create genesis block
    // these parameters are totally arbitrary
    this.createNewBlock(0, '0', '0');
}

Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, pendingTransactionsHash) {
    const newBlock = {
        index: this.chain.length + 1,   // block number in the chain
        timestamp: Date.now(),
        transactions: this.pendingTransactions, // all the pending transactions
        nonce: nonce,   // nonce comes from Proof of Work
        hash: pendingTransactionsHash,     // all transactions data have been hashed into one string
        previousBlockHash: previousBlockHash
    };

    // new or pending transactions have been added to a new block
    // clear out space for the next incoming transactions
    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
}

Blockchain.prototype.getLastBlock = function() {
    return this.chain[this.chain.length - 1];
}

Blockchain.prototype.createNewTransaction = function(amount, senderAddress, recipientAddress) {
    // these transactions are pending transactions. They have not been validated yet
    const newTransaction = {
        amount: amount,
        senderAddress: senderAddress,
        recipientAddress: recipientAddress,
        transactionId: uuid().split("-").join("")
    }

    return newTransaction;
}

Blockchain.prototype.addTransactionToPendingTransactions = function(transactionObj) {
    this.pendingTransactions.push(transactionObj);
        
    // this transaction will be found in the next mined block
    return this.getLastBlock()['index'] + 1;
}

Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce) {
    // take a block and hash it into a fixed length string
    const dataAsString = previousBlockHash + 
                            nonce.toString() + 
                            JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
}

Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData) {
    /* 
        repeatedly hash block till it finds a "correct hash" of starting with 4 zeroes
        uses currentBlockData and previousBlockHash, so the only variable here is the nonce
        the nonce continuously changes till the right hash is is produced -- this is by trial and error

        return the nonce that create the correct hash
    */
   let nonce = 0;
   let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
   while (hash.substr(0, 4) != '0000') {
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
   }

   return nonce;
}

module.exports =  Blockchain;