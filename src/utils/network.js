const bitcoin = require('bitcoinjs-lib')
const NETWORK = process.env.NETWORK === 'testnet' ? bitcoin.networks.testnet : process.env.NETWORK == "regtest" ? bitcoin.networks.regtest : bitcoin.networks.bitcoin;

exports = {
    NETWORK
}