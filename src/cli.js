const dotenv = require('dotenv')
const os = require('os');
const fs = require('fs').promises;
const { Command } = require('commander');
const { 
  Atomicals, 
  ElectrumApi
} = require('atomicals-js')

const { AtomicalsGetFetchType } = require('./types/atom')
const { sleep } = require('./utils/time')
const { walletPathResolver } = require('./utils/wallet-path-resolver')
const { jsonFileReader } = require('./utils/file-util')
const { getKeypairInfo } = require('./utils/address-keypair-path')
const { waitConfirmed } = require('./helper/atom_helper')
const { acquireLock, releaseLock, isLockActive, hasLock } = require('./utils/file_lock')
const { MintQueue } = require('./core/mint_queue')
const { ECPairFactory } = require('ecpair');
const { waitBlockHeight } = require('./utils/wait-height');

const bitcoin = require('bitcoinjs-lib')

const tinysecp = require('tiny-secp256k1');
bitcoin.initEccLib(tinysecp);

const mempoolJS = require("@mempool/mempool.js")

const { bitcoin: { addresses, transactions } } = mempoolJS({
  hostname: 'mempool.space'
});

if (!process.stdout.cursorTo) {
  process.stdout.cursorTo = function (x, y) {};
}

if (!process.stdout.clearLine) {
  process.stdout.clearLine = function (dir) {};
}

if (!process.stdout.moveCursor) {
  process.stdout.moveCursor = function (dx, dy) {};
}

dotenv.config();

/////////////////////////////////////////////////////////////////////////////////////////////
// General Helper Functions
/////////////////////////////////////////////////////////////////////////////////////////////
function printOperationResult(data, error) {
  console.log(JSON.stringify(data, null, 2));
}
function handleResultLogging(result) {
  if (!result || !result.success) {
    printOperationResult(result, true);
  } else {
    printOperationResult(result.data);
  }
}

function getRandomBitwork4() {
  const r = Math.floor(1000 + Math.random() * 9000);
  return r + '';
}

const program = new Command();

program
  .name('Atomicals Scriber Utility')
  .description('Command line utility for interacting with Atomicals')
  .version('0.1.0');

program.command('wallet-init')
  .description('Initializes a new wallet at wallet.json')
  .option('--phrase <string>', 'Provide a wallet phrase')
  .option('--path <string>', 'Provide a path base', `m/86'/0'/0'`)
  .option('--n <number>', 'Provider number of alias')
  .action(async (options) => {
    try {
      const result = await Atomicals.walletInit(options.phrase, options.path, options.n ? parseInt(options.n, 10) : undefined);
      console.log('Wallet created at wallet.json');
      console.log(`phrase: ${result.data.phrase}`);
      console.log(`Primary address (P2TR): ${result.data.primary.address}`);
      console.log(`Primary address WIF: ${result.data.primary.WIF}`);
      console.log(`Primary address path: ${result.data.primary.path}`);
      console.log(`Funding address (P2TR): ${result.data.funding.address}`);
      console.log(`Funding address WIF: ${result.data.funding.WIF}`);
      console.log(`Funding address path: ${result.data.funding.path}`);
      console.log(`Full Data: ${JSON.stringify(result.data, null, 2)}`);
      console.log(`------------------------------------------------------`);
    } catch (err) {
      console.log('Error', err);
    }
  });

program.command('auto-mint-dft')
  .description('Mint coins for a decentralized fungible token (FT)')
  .argument('<ticker>', 'string')
  .option('--rbf', 'Whether to enable RBF for transactions.')
  .option('--initialowner <string>', 'Make change into this wallet')
  .option('--funding <string>', 'Use wallet alias wif key to be used for funding and change')
  .option('--satsbytelimit <number>', 'Satoshis per byte in fees', '15')
  .option('--disablechalk', 'Whether to disable the real-time chalked logging of each hash for Bitwork mining. Improvements mining performance to set this flag')
  .option('--confirmtimeout <number>', 'The timeout wait tx confirm, unit second', '300')
  .option('--repeat', 'Whether repeat mint')
  .option('--startblockheight <number>', 'Start mint after block height', '0')
  .action(async (ticker, options) => {
    try {
      const walletPath = walletPathResolver();
      const walletInfo = await jsonFileReader(walletPath);
      const walletRecord = walletInfo.primary;
      const fundingRecord = walletInfo.funding;

      let rpcURL = process.env.ELECTRUMX_PROXY_BASE_URL || ''
      let rpcBaks = [rpcURL, process.env.ELECTRUMX_PROXY_BASE_URL_BAK1, process.env.ELECTRUMX_PROXY_BASE_URL_BAK2, process.env.ELECTRUMX_PROXY_BASE_URL_BAK3];
  
      let retryTimes = 0;
      const electrumApi = ElectrumApi.createClient(rpcURL)

      let atomicals = new Atomicals(electrumApi);
  
      console.log("options:", JSON.stringify(options, null, 2));

      // wait block height to mint
      if (options.startblockheight > 0) {
        await waitBlockHeight(options.startblockheight)
      }

      while(true) {
        try {
          const satsbyte = parseInt(options.satsbytelimit);
          console.log("use satsbyte:", satsbyte);
  
          const result = await atomicals.mintDftInteractive({
            rbf: options.rbf,
            satsbyte: satsbyte,
            disableMiningChalk: options.disablechalk,
          }, walletRecord.address, ticker, fundingRecord.WIF);

          if (!result.success && result.error) {
            throw result.error;
          }

          handleResultLogging(result);

          if (options.repeat) {
            continue
          } else {
            console.log("mint finished");
            process.exit();
          }
        } catch(e) {
          console.log("mintDftInteractive error:", e)
          console.log("after 5s retry")
          await sleep(5000)
  
          retryTimes++;
          rpcURL = rpcBaks[retryTimes % rpcBaks.length]
          console.log("use new rpc:", rpcURL)
          atomicals = new Atomicals(ElectrumApi.createClient(rpcURL));
        }
      }
    } catch (error) {
      console.log(error);
    }
  });

program.command('auto-mint-ditems')
  .description('Mint item non-fungible token (NFT) Atomical from a decentralized container')
  .argument('<containerName>', 'string')
  .argument('<manifestDir>', 'string')
  .option('--rbf', 'Whether to enable RBF for transactions.')
  .option('--owner <string>', 'Owner of the parent Atomical. Used for direct subrealm minting.')
  .option('--initialowner <string>', 'Initial owner wallet alias to mint the Atomical into')
  .option('--satsbytelimit <number>', 'Satoshis per byte in fees', '15')
  .option('--satsoutput <number>', 'Satoshis to put into the minted atomical', '1000')
  .option('--funding <string>', 'Use wallet alias WIF key to be used for funding and change')
  .option('--container <string>', 'Name of the container to request')
  .option('--bitworkc <string>', 'Whether to put any bitwork proof of work into the token mint. Applies to the commit transaction.')
  .option('--bitworkr <string>', 'Whether to put any bitwork proof of work into the token mint. Applies to the reveal transaction.')
  .option('--disablechalk', 'Whether to disable the real-time chalked logging of each hash for mining. Improvements mining performance to set this flag')
  .option('--confirmtimeout <number>', 'The timeout wait tx confirm, unit second', '300')
  .option('--delay <number>', 'delay time for mint', '300')
  .option('--startblockheight <number>', 'Start mint after block height', '0')
  .action(async (containerName, manifestDir, options) => {
    try {
      const walletPath = walletPathResolver();
      const walletInfo = await jsonFileReader(walletPath);
      const walletRecord = walletInfo.primary;
      const ownerWalletRecord = walletInfo.primary;
      const fundingRecord = walletInfo.funding;

      let rpcURL = process.env.ELECTRUMX_PROXY_BASE_URL || ''
      let rpcBaks = [rpcURL, process.env.ELECTRUMX_PROXY_BASE_URL_BAK1, process.env.ELECTRUMX_PROXY_BASE_URL_BAK2, process.env.ELECTRUMX_PROXY_BASE_URL_BAK3];
  
      let retryTimes = 0;

      console.log("options:", JSON.stringify(options, null, 2));

      const delay = parseInt(options.delay);
      console.log("delay start at:", delay);
      await sleep(delay * 1000)

      // wait block height to mint
      if (options.startblockheight > 0) {
        await waitBlockHeight(options.startblockheight)
      }

      const mintQueue = new MintQueue(containerName, manifestDir, async (processingPath)=>{
        const manifestContent = JSON.parse(await fs.readFile(processingPath, 'utf8'));
        console.log("itemFile content:", manifestContent)
        return manifestContent.data.args.request_dmitem;
      });

      while(true) {
        try {
          const mintTask = await mintQueue.processing();
          if (!mintTask) {
            console.log("no more mint task to processing!");
            return
          }
  
          console.log("current mint task:", mintTask);
  
          const broadcastLock = mintTask.manifestFile + '.broadcast_lock';
          const electrumApi = ElectrumApi.createClient(rpcURL)
          const rawBroadcast = electrumApi.broadcast;
          electrumApi.broadcast = async function(rawtx, force) {
            console.log("try acquire file lock ", broadcastLock);
    
            if (!await hasLock(electrumApi, broadcastLock) && await isLockActive(electrumApi, broadcastLock)) {
              console.log("file lock actived, exit!");
              process.exit();
            }
  
            try {
              await acquireLock(electrumApi, broadcastLock);
    
              return rawBroadcast.call(electrumApi, rawtx, force)
            } catch(err) {
              await releaseLock(electrumApi, broadcastLock);
              throw err
            }
          }
  
          let atomicals = new Atomicals(electrumApi);

          try {
            console.log("waitConfirmed check start");
            await waitConfirmed(atomicals, fundingRecord.address, options.confirmtimeout);
          } catch(e) {
            console.log("waitConfirmed error:", e)
  
            if (e.message != "timeout") {
              throw e
            }
  
            continue
          }

          const satsbyte = parseInt(options.satsbytelimit);
          console.log("use satsbyte:", satsbyte);

          const result = await atomicals.mintContainerItemInteractive({
            rbf: options.rbf,
            meta: options.meta,
            ctx: options.ctx,
            init: options.init,
            satsbyte: satsbyte,
            satsoutput: parseInt(options.satsoutput),
            container: options.container,
            bitworkc: options.bitworkc,
            bitworkr: options.bitworkr,
            disableMiningChalk: options.disablechalk,
          }, mintTask.containerName, mintTask.itemName, mintTask.manifestFile, walletRecord.address, fundingRecord.WIF, ownerWalletRecord);
  
          if (!result.success && result.error) {
            throw result.error;
          }
  
          handleResultLogging(result);

          await mintQueue.markAsCompleted(mintTask);
        } catch(e) {
          console.log("mintDftInteractive error:", e)

          if (e.message.indexOf('Container item is already claimed') >=0) {
            await mintQueue.markAsCompleted(mintTask);
            continue
          }

          console.log("after 5s retry")
          await sleep(5000)
  
          retryTimes++;
          rpcURL = rpcBaks[retryTimes % rpcBaks.length]
          console.log("use new rpc:", rpcURL)
          atomicals = new Atomicals(ElectrumApi.createClient(rpcURL));
        }
      }
    } catch (error) {
      console.log(error);
    }
  });

program.command('auto-mint-realms')
  .description('Mint top level Realm non-fungible token (NFT) Atomical')
  .argument('<realm-dir>', 'string')
  .option('--rbf', 'Whether to enable RBF for transactions.')
  .option('--initialowner <string>', 'Initial owner wallet alias to mint the Atomical into')
  .option('--satsbytelimit <number>', 'Satoshis per byte in fees', '25')
  .option('--satsoutput <number>', 'Satoshis to put into the minted atomical', '1000')
  .option('--funding <string>', 'Use wallet alias WIF key to be used for funding and change')
  .option('--container <string>', 'Name of the container to request')
  .option('--bitworkc <string>', 'Whether to put any bitwork proof of work into the token mint. Applies to the commit transaction.')
  .option('--bitworkr <string>', 'Whether to put any bitwork proof of work into the token mint. Applies to the reveal transaction.')
  .option('--parent <string>', 'Whether to require a parent atomical to be spent along with the mint.')
  .option('--parentowner <string>', 'Wallet owner of the parent to spend along with the mint.')
  .option('--disablechalk', 'Whether to disable the real-time chalked logging of each hash for mining. Improvements mining performance to set this flag')
  .option('--confirmtimeout <number>', 'The timeout wait tx confirm, unit second', '300')
  .option('--delay <number>', 'delay time for mint', '300')
  .option('--startblockheight <number>', 'Start mint after block height', '0')
  .action(async (realmDir, options) => {
    try {
      const walletPath = walletPathResolver();
      const walletInfo = await jsonFileReader(walletPath);
      const walletRecord = walletInfo.primary;
      const parentOwnerRecord = walletInfo.primary;
      const ownerWalletRecord = walletInfo.primary;
      const fundingRecord = walletInfo.funding;

      let rpcURL = process.env.ELECTRUMX_PROXY_BASE_URL || ''
      let rpcBaks = [rpcURL, process.env.ELECTRUMX_PROXY_BASE_URL_BAK1, process.env.ELECTRUMX_PROXY_BASE_URL_BAK2, process.env.ELECTRUMX_PROXY_BASE_URL_BAK3];
  
      let retryTimes = 0;

      console.log("options:", JSON.stringify(options, null, 2));

      const delay = parseInt(options.delay);
      console.log("delay start at:", delay);
      await sleep(delay * 1000)

      // wait block height to mint
      if (options.startblockheight > 0) {
        await waitBlockHeight(options.startblockheight)
      }

      const mintQueue = new MintQueue("realm", realmDir, async (itemFile)=>{
        const manifestContent = JSON.parse(await fs.readFile(itemFile, 'utf8'));
        console.log("itemFile content:", manifestContent)
        return manifestContent.data.args.request_realm_name;
      });

      while(true) {
        try {
          const mintTask = await mintQueue.processing();
          if (!mintTask) {
            console.log("no more mint task to processing!");
            return
          }
  
          console.log("current mint task:", mintTask);
  
          const broadcastLock = mintTask.manifestFile + '.broadcast_lock';
          const electrumApi = ElectrumApi.createClient(rpcURL)
          const rawBroadcast = electrumApi.broadcast;
          electrumApi.broadcast = async function(rawtx, force) {
            console.log("try acquire file lock ", broadcastLock);
    
            if (!await hasLock(electrumApi, broadcastLock) && await isLockActive(electrumApi, broadcastLock)) {
              console.log("file lock actived, exit!");
              process.exit();
            }
  
            try {
              await acquireLock(electrumApi, broadcastLock);
    
              return rawBroadcast.call(electrumApi, rawtx, force)
            } catch(err) {
              await releaseLock(electrumApi, broadcastLock);
              throw err
            }
          }
  
          let atomicals = new Atomicals(electrumApi);

          try {
            console.log("waitConfirmed check start");
            await waitConfirmed(atomicals, fundingRecord.address, options.confirmtimeout);
          } catch(e) {
            console.log("waitConfirmed error:", e)
  
            if (e.message != "timeout") {
              throw e
            }
  
            continue
          }

          const satsbyte = parseInt(options.satsbytelimit);
          console.log("use satsbyte:", satsbyte);

          const result = await atomicals.mintRealmInteractive({
            rbf: options.rbf,
            meta: options.meta,
            ctx: options.ctx,
            init: options.init,
            satsbyte: satsbyte,
            satsoutput: parseInt(options.satsoutput),
            container: options.container,
            bitworkc: options.bitworkc ? options.bitworkc : getRandomBitwork4(),
            bitworkr: options.bitworkr,
            parent: options.parent,
            parentOwner: parentOwnerRecord,
            disableMiningChalk: options.disablechalk,
          }, mintTask.itemName, ownerWalletRecord.address, fundingRecord.WIF);
  
          if (!result.success && result.error) {
            throw result.error;
          }
  
          handleResultLogging(result);

          await mintQueue.markAsCompleted(mintTask);
        } catch(e) {
          console.log("mintDftInteractive error:", e)

          if (e.message.indexOf('Container item is already claimed') >=0) {
            await mintQueue.markAsCompleted(mintTask);
            continue
          }

          console.log("after 5s retry")
          await sleep(5000)
  
          retryTimes++;
          rpcURL = rpcBaks[retryTimes % rpcBaks.length]
          console.log("use new rpc:", rpcURL)
          atomicals = new Atomicals(ElectrumApi.createClient(rpcURL));
        }
      }
    } catch (error) {
      console.log(error);
    }
  });

program.command('state')
  .description('Get the state of an Atomical')
  .argument('<atomicalAliasOrId>', 'string')
  .option('--verbose', 'Verbose output')
  .action(async (atomicalAliasOrId, options) => {
    try {
      const atomicals = new Atomicals(ElectrumApi.createClient(process.env.ELECTRUMX_PROXY_BASE_URL || ''));
      const verbose = options.verbose ? true : false;
      const result = await atomicals.resolveAtomical(atomicalAliasOrId, AtomicalsGetFetchType.STATE, verbose);
      handleResultLogging(result);
    } catch (error) {
      console.log(error);
    }
  });

program.parse();
