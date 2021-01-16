const express = require('express');
const bodyParser=require('body-parser');
const uuid = require('uuid').v1;
const process = require('process');

const requestPromise = require('request-promise');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

const port = process.argv[2];

const Blockchain = require('./blockchain');
const bitcoin = new Blockchain();

// this simply fudges a unique string pretending to be this node's address
const thisNodeAddress = uuid().split("-").join(""); // get rid of dashes in the middle


app.get('/blockchain', function(req, res) {
    res.send(bitcoin);
});

// this gets invoked as a result of the broadcasts from whatever node had recieved the new transaction
// to begin with
app.post('/transaction', function(req, res) {
    const newTransaction = req.body;
    const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
    res.json({note: `transaction will be added to block ${blockIndex}`});
});

app.post('/transaction/broadcast', function(req, res) {
    const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.senderAddress, req.body.recipientAddress);
    bitcoin.addTransactionToPendingTransactions(newTransaction);

    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        }

        // accumulate all the promises
        requestPromises.push(requestPromise(requestOptions));
    });

    // run them all
    Promise.all(requestPromises)
        // eslint-disable-next-line no-unused-vars
        .then(data => {
            res.json({note: `transaction created and broadcast successfully`});
        })
});

// make a new block
app.get('/mine', function(req, res) {
    const lastBlock = bitcoin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index']+1
    };

    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/recieve-new-block',
            method: "POST",
            body: {newBlock: newBlock},
            json: true
        };
        console.log('sending recieve-new-block:' + requestOptions);
        requestPromises.push(requestPromise(requestOptions));
    });

    Promise.all(requestPromises)
        // eslint-disable-next-line no-unused-vars
        .then(data => {
            /* the way the code is written, the reward will be added to the NEXT block.  Which means that Block 2 is not geeting a reward.
            It seems that the mining reward should go into the block which was mined, not into a later block
            */
            // reward the miner with a little bit of bitcoin -- it goes into the same block
            // if the sender address is 00, it is a mining reward
            // and we want to send this reward to this one node where the mining api was called
            const requestOptions = {
                uri: bitcoin.currentNodeUrl + '/transaction/broadcast',
                method: 'POST',
                body: {
                    amount: 0.001, 
                    senderAddress: "00", 
                    recipientAddress: thisNodeAddress
                },
                json: true
            };
            console.log(requestOptions);
            return requestPromise(requestOptions);
        })
        // eslint-disable-next-line no-unused-vars
        .then(data => {
            res.json({
                note: 'New block mined and broadcast successfully',
                block: newBlock
            });
        });
});


app.post('/recieve-new-block', function(req, res) {
    const newBlock = req.body.newBlock;
    const lastBlock = bitcoin.getLastBlock();
    const correctHash = (lastBlock.hash === newBlock.previousBlockHash );
    const correctIndex = (lastBlock['index']+1 === newBlock['index']);

    console.log('recieve-new-block');
    if (correctHash && correctIndex) {
        console.log('recieve-new-block is correct');

        bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions = [];
        res.json({
            note: `New block recieved and accepted`,
            newBlock: newBlock
        });
    } else {
        console.log('recieve-new-block is rejected');

        res.json({
            note: `New block rejected`,
            newBlock: newBlock
        });
    }
});

// register a node and broadcast this node to the whole network
app.post('/register-and-broadcast-node', function(req, res) {
    const newNodeUrl = req.body.newNodeUrl;

    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1)
        bitcoin.networkNodes.push(newNodeUrl);

    // broadcast the new node to all the other nodes for registration
    const registerNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: {newNodeUrl: newNodeUrl},
            json: true
        };

        // these calls are async
        registerNodesPromises.push(requestPromise(requestOptions));
    });

    // wait for them all to be resolved
    Promise.all(registerNodesPromises)
        // eslint-disable-next-line no-unused-vars
        .then(data => {
            // all the existing nodes get sent to the new incoming node in one shot
            const bulkRegisterOptions = {
                uri: newNodeUrl + '/register-nodes-bulk',
                method: 'POST',
                // send all the urls registered, plus the current one
                body: {allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl]},
                json: true
            };

            return requestPromise(bulkRegisterOptions);
        })
        // eslint-disable-next-line no-unused-vars
        .then(data => {
            // this step happens when the promise above is completed
            res.json({note: 'New node registered with network successfully'});
        })
});

// register a node with the network, no broadcasting
app.post('/register-node', function(req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = (newNodeUrl !== bitcoin.currentNodeUrl);
    if (nodeNotAlreadyPresent && notCurrentNode)
        bitcoin.networkNodes.push(newNodeUrl);
    res.json({note: 'New node registered successfully with node'});
});

// register multiple nodes at once
// this function is hit only on the new node that is being added.  The node
// that it was added to calls this function to let the new node know what
// all the other node are
app.post('/register-nodes-bulk', function(req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;

    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = (bitcoin.currentNodeUrl !== networkNodeUrl);
        if (nodeNotAlreadyPresent && notCurrentNode)
            bitcoin.networkNodes.push(networkNodeUrl);
    });

    res.json({note: 'Bulk nodes registration successful'});
});

/*
to test this, create a network of nodes and create a bunch of blocks
then add a new node -- and it wont have the correct data.  Then you run this consensus code and the
invalid data should get replaced
*/
app.get('/consensus', function(req, res) {
    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
           uri: networkNodeUrl + '/blockchain',
           json: true
        };

        requestPromises.push(requestPromise(requestOptions));
    });

    Promise.all(requestPromises)
        .then(blockchains => {
            const currentChainLength = bitcoin.chain.length;
            let maxChainLength = currentChainLength;
            let newLongestChain = null;
            let newPendingTransactions = null;

            // is there a longer chain in the network ?
            // if there is, that must be the 'true' blockchain
            // and we want to take its transactions as the source of truth
            blockchains.forEach(blockchain => {
                if (blockchain.chain.length > maxChainLength) {
                    maxChainLength = blockchain.chain.length;
                    newLongestChain = blockchain.chain;
                    newPendingTransactions = blockchain.pendingTransactions;
                }
            });

            if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))) {
                res.json({note: 'current chain has not been replaced', chain: bitcoin.chain});
            } else {
                // replace the blockchain on the current node
                bitcoin.chain = newLongestChain;
                bitcoin.pendingTransactions = newPendingTransactions;
                res.json({note: 'this chain has been replaced', chain: bitcoin.chain});
            }
        });
});


app.get('/block/:blockHash', function(req, res) {
    const blockHash = req.params.blockHash;
    const correctBlock = bitcoin.getBlock(blockHash);
    res.json({block: correctBlock});
});

app.get('/transaction/:transactionId', function(req, res) {
    const transactionId = req.params.transactionId;
    const transactionData = bitcoin.getTransaction(transactionId);

    res.json({
        transaction: transactionData.transaction,
        block: transactionData.block
    });
});

app.get('/address/:address', function(req, res) {
    const address = req.params.address;
    const addressData = bitcoin.getAddressData(address);
    res.json({
        addressData: addressData
    });
});


app.listen(port, function() {
    console.log(`listening on port ${port}`); 
});