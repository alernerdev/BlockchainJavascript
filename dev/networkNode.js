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
        transactons: bitcoin.pendingTransactions,
        index: lastBlock['index'+1]
    };

    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    // reward the miner with a little bit of bitcoin -- it goes into the same block
    // if the sender address is 00, it is a mining reward
    // and we want to send this reward to this one node where the mining api was called
    bitcoin.createNewTransaction(0.001, "00", thisNodeAddress);

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);
    res.json({
        note: 'New block mined successfully',
        block: newBlock
    });
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

app.listen(port, function() {
    console.log(`listening on port ${port}`); 
});