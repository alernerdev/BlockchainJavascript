const Blockchain = require('./blockchain');
const bitcoin = new Blockchain();

const bc1 = 
{
    "chain": [
        {
        "index": 1,
        "timestamp": 1610676735951,
        "transactions": [],
        "nonce": 0,
        "hash": "0",
        "previousBlockHash": "0"
        },
        {
        "index": 2,
        "timestamp": 1610676767637,
        "transactions": [],
        "nonce": 18140,
        "hash": "0000b9135b054d1131392c9eb9d03b0111d4b516824a03c35639e12858912100",
        "previousBlockHash": "0"
        }
        ],
        "pendingTransactions": [
        {
        "amount": 0.001,
        "senderAddress": "00",
        "recipientAddress": "1672ed0056d711eb8321591962ff1f75",
        "transactionId": "297457e056d711eb8321591962ff1f75"
        }
        ],
        "currentNodeUrl": "http://localhost:3001",
        "networkNodes": []
};

    console.log('VALID:', bitcoin.chainIsValid(bc1.chain));

/*
const prevBlockHash = "AAAOOOBBB";
const currentBlockData = [{
    amount: 100,
    senderAddress: 'bobaddress',
    recipientAddress: 'jenrecipient'
}, {
    amount: 1.25,
    senderAddress: 'samaddress',
    recipientAddress: 'jenrecipient'
}, {
    amount: 99,
    senderAddress: 'ireneaddress',
    recipientAddress: 'jenrecipient'
}];

let nonce = bitcoin.proofOfWork(prevBlockHash, currentBlockData);
let hash = bitcoin.hashBlock(prevBlockHash, currentBlockData, nonce);

console.log(hash);

// console.log(bitcoin.proofOfWork(prevBlockHash, currentBlockData));
*/


/*
bitcoin.createNewBlock(1234, 'dfgbdfgb', 'gbtgbgtbeg');
bitcoin.createNewTransaction(100, 'alexsender', 'jenrecipient');

bitcoin.createNewBlock(56, 'dDDDfgbdfgb', 'gbtgYYYbgtbeg');



console.log(bitcoin.chain[1]);*/