const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
bitcoin.initEccLib(ecc);
const { NETWORK } = require('./network');

const toXOnly = (publicKey) => {
    return publicKey.slice(1, 33);
}

exports.KeyPairInfo = class {
  constructor(address, output, childNodeXOnlyPubkey, tweakedChildNode, childNode) {
    this.address = address;
    this.output = output;
    this.childNodeXOnlyPubkey = childNodeXOnlyPubkey;
    this.tweakedChildNode = tweakedChildNode;
    this.childNode = childNode;
  }
}

exports.getKeypairInfo = (childNode) => {
  const childNodeXOnlyPubkey = toXOnly(childNode.publicKey);
  const { address, output } = bitcoin.payments.p2tr({
    internalPubkey: childNodeXOnlyPubkey,
    network: NETWORK
  });
  const tweakedChildNode = childNode.tweak(
    bitcoin.crypto.taggedHash('TapTweak', childNodeXOnlyPubkey),
  );

  return new exports.KeyPairInfo(address, output, childNodeXOnlyPubkey, tweakedChildNode, childNode);
}
