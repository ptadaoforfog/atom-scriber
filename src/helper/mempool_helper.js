

const getRecommendedFees = async ()=>{
  const resp = await fetch("https://mempool.space/api/v1/fees/recommended", {
    "headers": {
      "accept": "*/*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6",
      "if-none-match": "W/\"4f-xc2C8/gms49JVnlAq2fMa0kxKO0\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site"
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "omit"
  });

  return resp.json()
}

const getAddressTxs = async (address)=>{
  const resp = await fetch(`https://mempool.space/api/address/${address}/txs`, {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6",
      "sec-ch-ua": "\"Google Chrome\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    },
    "referrer": `https://mempool.space/address/${address}`,
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "omit"
  });

  return resp.json()
}

module.exports = {
  getRecommendedFees: getRecommendedFees,
  getAddressTxs: getAddressTxs
}