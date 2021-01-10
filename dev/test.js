const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();
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


/*
bitcoin.createNewBlock(1234, 'dfgbdfgb', 'gbtgbgtbeg');
bitcoin.createNewTransaction(100, 'alexsender', 'jenrecipient');

bitcoin.createNewBlock(56, 'dDDDfgbdfgb', 'gbtgYYYbgtbeg');



console.log(bitcoin.chain[1]);*/