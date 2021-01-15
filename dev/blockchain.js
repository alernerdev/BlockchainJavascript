const sha256 = require('sha256');
const uuid = require('uuid').v1;
const process = require('process');

const currentNodeUrl = process.argv[3];

function Blockchain() {
    this.chain = [];
   // new transactions before they are placed into the chain
    this.pendingTransactions = [];

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];

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
   while (hash.substring(0, 4) != '0000') {
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
   }

   return nonce;
}

/* select the longest chain as the winner */
Blockchain.prototype.chainIsValid = function(chain) {
    // iterate over block and make sure the previous block hash is equal to the current block's previousHash

    for (var i=1; i < chain.length; i++) {
        const currentBlock = chain[i];
        const prevBlock = chain[i-1];
        const blockHash = this.hashBlock(
            prevBlock['hash'], 
            {transactions: currentBlock['transactions'], index: currentBlock['index']},
            currentBlock['nonce']
        );
        console.log(prevBlock['hash'], blockHash, currentBlock['index'], currentBlock['nonce']);
        if (blockHash.substring(0, 4) != '0000') {
             return false;           
        }

        if ( currentBlock['previousBlockHash'] !==  prevBlock['hash']) { // chain not valid
             return false;           
        }
    }

    const genesisBlock = chain[0];
    const correctNonce = genesisBlock['nonce'] === 0;
    const correctPreviousBlockHash = (genesisBlock['previousBlockHash'] === '0');
    const correctHash = (genesisBlock['hash'] === '0');
    const correctTransactions = (genesisBlock['transactions'].length === 0);
    if (!correctTransactions || !correctNonce || !correctHash || !correctPreviousBlockHash)
        return false;

    return true;
}

module.exports =  Blockchain;