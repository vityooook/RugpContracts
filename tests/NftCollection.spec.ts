import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, Dictionary, toNano, TupleBuilder} from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { NftItem } from '../wrappers/NftItem';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

type AddrList = Dictionary<Address, Boolean>;

describe('NftCollection', () => {
    let nft_collection: Cell;
    let nft_item: Cell;
    let blockchain: Blockchain;
    let owner: SandboxContract<TreasuryContract>;
    let buyer_silver: SandboxContract<TreasuryContract>;
    let buyer_gold: SandboxContract<TreasuryContract>;
    let jetton: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;
    let bueyrNft: (index: number) => Promise<SandboxContract<NftItem>>;

    beforeAll(async () => {
        nft_collection = await compile("NftCollection");
        nft_item = await compile("NftItem");
        blockchain = await Blockchain.create();
        blockchain.now = Math.floor(Date.now() / 1000);
        owner = await blockchain.treasury('owner');
        buyer_silver = await blockchain.treasury('buyer_silver');
        buyer_gold = await blockchain.treasury('buyer_gold');
        jetton = await blockchain.treasury('jetton');
        let whitelist: AddrList = Dictionary.empty();
        whitelist.set(buyer_gold.address, false);
        whitelist.set(buyer_gold.address, false);

        // blockchain.verbosity = {
        //     print: true,
        //     blockchainLogs: true,
        //     vmLogs: "vm_logs_full",
        //     debugLogs: true,
        // };


        nftCollection = blockchain.openContract(NftCollection.createFromConfig({
            owner_address: owner.address,
            buyer_limit_silver: 1,
            ton_price_silver: toNano("10"),
            jetton_price_gold: toNano("10000"),
            nft_item_code: nft_item,
            whitelist: whitelist,
            royalty_params_data: {
                royaltyAddress: owner.address,
                royaltyBase: 0,
                royaltyFactor: 100
            },
            content_collection: "https://storage.anon.tg/nft/anon_8club/collection.json",
            content_item: "https://storage.anon.tg/nft/anon_8club/",
            content_item_silver: "nft.json",
            content_item_gold: "bebeb.json"
        }, nft_collection));

        bueyrNft = async (index: number) => blockchain.openContract(NftItem.createFromAddress((await nftCollection.getItemAddress(index)).nft_item_address));
    });

    // начинаем от сюда 

    it('should deploy collection contract', async () => {
        const deployResult = await nftCollection.sendDeploy(owner.getSender(), toNano("0.5"), jetton.address);

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should buy silver nft', async () => {

        const collectionData = await nftCollection.getAllInformation();

        const nftItem = await bueyrNft(collectionData.last_index);

        const deployResult = await nftCollection.sendDeployNftTon(buyer_silver.getSender(), toNano("10"))

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItem.address,
            deploy: true,
            success: true
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: owner.address,
            success: true
        })
    });

    it('should not buy silver nft', async () => {


        var deployResult = await nftCollection.sendDeployNftTon(buyer_silver.getSender(), toNano("1"))

        expect(deployResult.transactions).toHaveTransaction({
            from: buyer_silver.address,
            to: nftCollection.address,
            exitCode: 800
        })

        deployResult = await nftCollection.sendDeployNftTon(buyer_silver.getSender(), toNano("10"))

        expect(deployResult.transactions).toHaveTransaction({
            from: buyer_silver.address,
            to: nftCollection.address,
            exitCode: 801
        })
    });

    it('not owner', async () => {


        var deployResult = await nftCollection.sendChangePrice(buyer_silver.getSender(), {
            ton_price_silver: toNano("9"),
            jetton_price_gold: toNano("10")
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: buyer_silver.address,
            to: nftCollection.address,
            exitCode: 802
        })
    });

    it('owner should deploy nft', async () => {

        const collectionData = await nftCollection.getAllInformation();

        const nftItem = await bueyrNft(collectionData.last_index);

        var deployResult = await nftCollection.sendDeployNft(owner.getSender(), {
            itemIndex: collectionData.last_index,
            itemOwnerAddress: buyer_silver.address,
            itemContent: ""
        })

        expect(deployResult.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItem.address,
            success: true,
            deploy: true
        })
    });

    it('should change data', async () => {

        const collectionDataBefore = await nftCollection.getAllInformation();

        await nftCollection.sendChangeOwnerAndLimit(owner.getSender(), {
            owner_address: owner.address,
            buyer_limit_silver: 100
        })

        await nftCollection.sendChangePrice(owner.getSender(), {
            ton_price_silver: toNano("1000"),
            jetton_price_gold: toNano("1")
        })

        const collectionDataAfter = await nftCollection.getAllInformation();

        expect(collectionDataBefore.buyer_limit_silver).not.toEqual(collectionDataAfter.buyer_limit_silver);
        expect(collectionDataBefore.ton_price_silver).not.toEqual(collectionDataAfter.ton_price_silver);
        expect(collectionDataBefore.jetton_price_gold).not.toEqual(collectionDataAfter.jetton_price_gold);
    });

    it('buy purchase for jetton', async () => {
        const collectionData = await nftCollection.getAllInformation();


        const nftItem = await bueyrNft(collectionData.last_index);

        const tr = await jetton.send({
            to: nftCollection.address,
            value: toNano("0.2"),
            sendMode: 1,
            body: beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(toNano("1"))
                .storeAddress(buyer_gold.address)
            .endCell()
        })
        

        expect(tr.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: nftItem.address,
            deploy: true,
            success: true
        })

        expect(tr.transactions).toHaveTransaction({
            from: nftCollection.address,
            to: jetton.address,
        })
    })

    it('decline purchase nft for jetton', async () => {
        const collectionDataBefore = await nftCollection.getAllInformation();

        await jetton.send({
            to: nftCollection.address,
            value: toNano("0.2"),
            sendMode: 1,
            body: beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(toNano("1"))
                .storeAddress(buyer_silver.address) // not gold buyer
            .endCell()
        })

        await jetton.send({
            to: nftCollection.address,
            value: toNano("0.1"), // not enough value
            sendMode: 1,
            body: beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(toNano("1"))
                .storeAddress(buyer_gold.address)
            .endCell()
        })

        await jetton.send({
            to: nftCollection.address,
            value: toNano("0.2"), 
            sendMode: 1,
            body: beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(toNano("0.1")) // not enough jetton
                .storeAddress(buyer_gold.address)
            .endCell()
        })

        await buyer_gold.send({ // transaction not from jetton 
            to: nftCollection.address,
            value: toNano("0.2"), 
            sendMode: 1,
            body: beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(toNano("1")) 
                .storeAddress(buyer_gold.address)
            .endCell()
        })

        const collectionDataAfter = await nftCollection.getAllInformation();

        expect(collectionDataBefore.last_index).toEqual(collectionDataAfter.last_index);

    })

    it('should withdraw balance', async () => {

        const before = await owner.getBalance();

        await nftCollection.sendWithdrawTon(owner.getSender(), {
            address: owner.address,
            amount: toNano("0"),
            send_mode: 128
        })

        const after = await owner.getBalance();

        expect(before).toBeLessThan(after);
        
    });

});
