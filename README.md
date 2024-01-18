# atom-scriber
Atom Auto Batch Mint Tool.


## Install

```
# Download the github repo:
git clone https://github.com/ptadaoforfog/atom-scriber.git

cd atom-scriber

# Build:
# If you don't have yarn & node installed
# npm install -g node
# npm install -g yarn

yarn install

#See all commands at:

yarn cli --help

```

### Quick Start - Command Line (CLI)

First install packages, then follow the steps here to batch mint atom. Use `yarn cli`to get a list of all commands available.

#### 0. Environment File (.env)

The environment file comes with defaults (`.env.example`), but it is highly recommend to install and operate your own ElectrumX server. Web browser communication is possible through the `wss` (secure websockets) interface of ElectrumX.

```
ELECTRUMX_WSS=wss://electrumx.atomicals.xyz:50012
ELECTRUMX_PROXY_BASE_URL=https://ep.atomicals.xyz/proxy
ELECTRUMX_PROXY_BASE_URL_BAK1=https://ep.nextdao.xyz/proxy
ELECTRUMX_PROXY_BASE_URL_BAK2=https://ep.consync.xyz/proxy
ELECTRUMX_PROXY_BASE_URL_BAK3=https://ep.atomicalmarket.com/proxy
WALLET_PATH=.
WALLET_FILE=wallet.json
```

_ELECTRUMX_WSS_: URL of the ElectrumX with Atomicals support. Note that only `wss` endpoints are accessible from web browsers.

#### 1. Wallet Setup

The purpose of the wallet is to create p2tr (pay-to-taproot) spend scripts and to receive change from the transactions made for the various operations. _Do not put more funds than you can afford to lose, as this is still beta!_

To initialize a new `wallet.json` file that will store your address for receiving change use the `wallet-init` command. Alternatively, you may populate the `wallet.json` manually, ensuring that the address at `m/44'/0'/0'/0/0` is equal to the address and the derivePath is set correctly.

Configure the path in the environment `.env` file to point to your wallet file. defaults to `./wallet.json`

Default:

```
WALLET_PATH=.
WALLET_FILE=wallet.json
```

Create the wallet:

```
yarn cli wallet-init

>>>

Wallet created at wallet.json
phrase: maple maple maple maple maple maple maple maple maple maple maple maple
Legacy address (for change): 1FXL2CJ9nAC...u3e9Evdsa2pKrPhkag
Derive Path: m/44'/0'/0'/0/0
WIF: L5Sa65gNR6QsBjqK.....r6o4YzcqNRnJ1p4a6GPxqQQ
------------------------------------------------------
```

#### 2. Explore the CLI

```
yarn cli --help
```

#### 3. Example Commands

Auto mint loot

```
yarn cli auto-mint-dft loot --satsbytelimit=100 --confirmtimeout=300
```

Auto mint gb2312

Copy to mint gb2312 item JSON to examples/gb2312.

```
yarn cli auto-mint-ditems tcc examples/gb2312 --satsbytelimit=100 --confirmtimeout=300 --delay=0 --disablechalk
```

Auto mint realm

Create to mint realm JSONs in examples/realm.

```
yarn cli auto-mint-realms examples/realm --satsbytelimit=100 --confirmtimeout=300 --delay=0 --disablechalk
```

## Any questions or ideas?

https://github.com/ptadaoforfog/atom-scriber/issues

## Donate to Development

We greatly appreciate any donation to help support Atomicals Tool development. 

BTC: bc1p535dn32u62yxrs7qkug4ahe7vgq86ajlgs50ldpw7ynnxaxl3zus9q4jl4
