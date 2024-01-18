
const { randN } = require('../utils/rand')
const { sleep } = require('../utils/time')
const { getAddressTxs } = require('./mempool_helper')

const useWaitConfirmedV2 = false

async function waitConfirmedV1(atomicals, address, timeout) {
  const startTime = new Date().getTime();

  while(true) {
    const result = await atomicals.addressInfo(address, false);

    if (result.success) {
      const unconfirmCount = result.data.globalBalanceInfo.unconfirmed;

      if (unconfirmCount > 0 ){
        console.log(`found ${unconfirmCount} unconfirm tx!`)

        if ( new Date().getTime() > startTime + timeout*1000) {
          throw new Error('timeout')
        }

        var delay = randN(30, 60);
        console.log(`sleep ${delay}s`)
        await sleep(1000 * delay)

        continue
      } else {
        console.log(`no unconfirm tx`)
        break;
      }
    } else {
      console.log("atomicals.addressInfo errorMsg:", result.message, "error:", result.error)
      throw result.error;
    }
  }
}

async function waitConfirmedV2(atomicals, address, timeout) {
  const startTime = new Date().getTime();

  while(true) {
    const txs = await getAddressTxs(address);
    const unconfirmTxs = txs.filter((tx)=>!tx.status.confirmed)
    const unconfirmCount = unconfirmTxs.length;

    if (unconfirmCount > 0 ){
      console.log(`found ${unconfirmCount} unconfirm tx!`)

      if ( new Date().getTime() > startTime + timeout*1000) {
        throw new Error('timeout')
      }

      var delay = randN(30, 60);
      console.log(`sleep ${delay}s`)
      await sleep(1000 * delay)

      continue
    } else {
      console.log(`no unconfirm tx`)
      break
    }
  }
}

async function waitConfirmed(atomicals, address, timeout) {
  try {
    await waitConfirmedV1(atomicals, address, timeout)
  } catch(e) {
    if (e.message != "timeout") {
      throw e
    }
    
    if (useWaitConfirmedV2) {
      console.log(`use waitConfirmedV2`)
      await waitConfirmedV2(atomicals, address, timeout)
      return
    }

    throw e
  }
}

module.exports = {
  waitConfirmedV1: waitConfirmedV1,
  waitConfirmedV2: waitConfirmedV2,
  waitConfirmed: waitConfirmed,
}