const { sleep } = require('./time')
const { getBlockTimestamp } = require('../helper/mempool_helper')

async function waitBlockHeight(height) {
  while (true) {
    const ts = new Date().getTime()
    const resp = await getBlockTimestamp(ts)
    console.log(`current height: ${resp.height}`)
    
    if (resp.height >= height) {
      break
    }
    
    console.log(`wait 1m`)
    await sleep(1000 * 60)
  }
}

module.exports = {
  waitBlockHeight: waitBlockHeight
}