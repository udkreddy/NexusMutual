var _ = require('lodash');
var BN = require('bn.js');
var ethABI = require('ethereumjs-abi');
var util = require('ethereumjs-util');
const wallet = require('eth-lightwallet').keystore;
var lightwallet = require('eth-lightwallet');
async function getQuoteValues(...args) {
  var order = {
    amount: args[0][0],
    curr: args[1],
    CP: args[2],
    smartCA: args[3],
    Price: args[0][1],
    price_nxm: args[0][2],
    expire: args[0][3],
    generationTime: args[0][4],
    quotationContract: args[4]
  };
  var orderParts = [
    { value: bigNumberToBN(order.amount), type: 'uint' },
    { value: order.curr, type: 'bytes4' },
    { value: bigNumberToBN(order.CP), type: 'uint16' },
    { value: order.smartCA, type: 'address' },
    { value: bigNumberToBN(order.Price), type: 'uint' },
    { value: bigNumberToBN(order.price_nxm), type: 'uint' },
    { value: bigNumberToBN(order.expire), type: 'uint' },
    { value: bigNumberToBN(order.generationTime), type: 'uint' },
    { value: order.quotationContract, type: 'address' }
  ];

  var types = _.map(orderParts, function(o) {
    return o.type;
  });
  var values = _.map(orderParts, function(o) {
    return o.value;
  });
  var hashBuff = ethABI.soliditySHA3(types, values);
  var hashHex = util.bufferToHex(hashBuff);

  var ks = {
    salt: 'mDSSGi5eePbk3dBG4Ddk79f/Jwi5h3d0jI52F3M3yRg=',
    hdPathString: "m/44'/60'/0'/0",
    encSeed: {
      encStr:
        '1yzRGJIM7QTLqHzop5H96Txqpy/4P7DlgkPyPDzY9MsmmX6rT0M/4qNnNDX+wTY/NhZnFT84M6wZ8r8keBa/atNo81Xu84bNSRNk4b+W+9/69rcF3fNilP4GtxXE1X5WQhO7m6xeXDgGguQC9YdErDISAwvsSST8sVYhGkmmEtrp7GhE4xmeTA==',
      nonce: 'jsdTS0xT7ijtSljsgZabpktsZtNC633V'
    },
    encHdRootPriv: {
      encStr:
        'OXi2S5Fka6y4TG894bsagLcIPzfbwZlpq+ZTHjufbfaHccQmHnwEZDyjspTarf/OVc/nRI/qT1lOe68k+7bXSO8BTbnGxLorqYr9Qm+ImCaeexCRMYOdK9/Anm+2Aa2gLnjtlgBEf8dIEaWI8LoQhCKeJYSAFggXysoM31wYNQ==',
      nonce: 'XsKB+uXOmeSWzhN/XPQXTvru2Aa6pnob'
    },
    version: 3,
    hdIndex: 1,
    encPrivKeys: {
      '51042c4d8936a7764d18370a6a0762b860bb8e07': {
        key: 'hGPlIoOYX9PKV0CyHHfC1EKYIibpeLKDkEUfWGWqBz25c9yVIk4TCZvMmkzgEMqD',
        nonce: 'cDHUhUEaqkJ6OwB4BPJXi5Vw47tbvFYo'
      }
    },
    addresses: ['51042c4d8936a7764d18370a6a0762b860bb8e07']
  };
  ks = wallet.deserialize(JSON.stringify(ks));
  var pwDerivedKey;
  pwDerivedKey = new Uint8Array([
    51,
    95,
    185,
    86,
    44,
    101,
    34,
    239,
    87,
    233,
    60,
    63,
    119,
    227,
    100,
    242,
    44,
    242,
    130,
    145,
    0,
    32,
    103,
    29,
    142,
    236,
    147,
    33,
    254,
    230,
    9,
    225
  ]);

  const orderHashBuff = util.toBuffer(hashHex);
  const msgHashBuff = util.hashPersonalMessage(orderHashBuff);
  const sig = lightwallet.signing.signMsgHash(
    ks,
    pwDerivedKey,
    msgHashBuff,
    ks.addresses[0]
  );
  var vrsData = [];
  vrsData.push(sig.v);
  vrsData.push('0x' + util.toUnsigned(util.fromSigned(sig.r)).toString('hex'));
  vrsData.push('0x' + util.toUnsigned(util.fromSigned(sig.s)).toString('hex'));
  return vrsData;
}

function bigNumberToBN(value) {
  return new BN(value.toString(), 10);
}

module.exports = { getQuoteValues };
