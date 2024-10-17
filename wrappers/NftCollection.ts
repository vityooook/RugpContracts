import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, Dictionary, toNano, TupleBuilder } from '@ton/core';
import { encodeOffChainContent } from "./help/content";


export type AddrList = Dictionary<Address, Boolean>;


export type RoyaltyParams = {
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
};

export type NftCollectionConfig = {
    owner_address: Address;
    buyer_limit_silver: number;
    ton_price_silver: bigint;
    jetton_price_gold: bigint;
    nft_item_code: Cell;
    whitelist: AddrList;
    royalty_params_data: RoyaltyParams;
    content_collection: string;
    content_item: string;
    content_item_gold: string;
    content_item_silver: string;
};

export function buildNftCollectionContentCell(collectionContent: string, commonContent: string): Cell {
    let contentCell = beginCell();

    let encodedCollectionContent = encodeOffChainContent(collectionContent);

    let commonContentCell = beginCell();
    commonContentCell.storeBuffer(Buffer.from(commonContent));

    contentCell.storeRef(encodedCollectionContent);
    contentCell.storeRef(commonContentCell.asCell());

    return contentCell.endCell();
}

export function nftCollectionConfigToCell(config: NftCollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.owner_address)
        .storeAddress(config.owner_address) // заглушка 
        .storeUint(0, 32)
        .storeUint(config.buyer_limit_silver, 32)
        .storeCoins(config.ton_price_silver)
        .storeCoins(config.jetton_price_gold)
        .storeRef(config.nft_item_code)
        .storeDict(config.whitelist, Dictionary.Keys.Address(), Dictionary.Values.Bool())
        .storeRef(
            beginCell()
                .storeUint(config.royalty_params_data.royaltyFactor, 16)
                .storeUint(config.royalty_params_data.royaltyBase, 16)
                .storeAddress(config.royalty_params_data.royaltyAddress)
            .endCell()
        )
        .storeRef(
            beginCell()
                .storeRef(buildNftCollectionContentCell(config.content_collection, config.content_item))
                .storeRef(beginCell().storeBuffer(Buffer.from(config.content_item_silver)).endCell())
                .storeRef(beginCell().storeBuffer(Buffer.from(config.content_item_gold)).endCell())
            .endCell()
        )
    .endCell();
}

export class NftCollection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new NftCollection(address);
    }

    static createFromConfig(config: NftCollectionConfig, code: Cell, workchain = 0) {
        const data = nftCollectionConfigToCell(config);
        const init = { code, data };
        return new NftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, jetton_wallet_address: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(7, 32)
                .storeUint(0, 64)
                .storeAddress(jetton_wallet_address)
            .endCell(),
        });
    }

    async sendDeployNftTon(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(0, 64)
            .endCell(),
        });
    }


    async sendDeployNft(provider: ContractProvider, via: Sender, 
        opts: {
            itemIndex: number, 
            itemOwnerAddress: Address,
            itemContent: string,
        }
    ) {

        await provider.internal(via, {
            value: toNano("0.04"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(0, 64)
                .storeUint(opts.itemIndex, 32)
                .storeAddress(opts.itemOwnerAddress)
                .storeRef(
                    beginCell()
                        .storeBuffer(Buffer.from(opts.itemContent))
                    .endCell()
                )
            .endCell(),
        });
    }

    async sendChangeOwnerAndLimit(provider: ContractProvider, via: Sender, opts: {
        owner_address: Address;
        buyer_limit_silver: number;
    }) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(0, 64)
                .storeAddress(opts.owner_address)
                .storeUint(opts.buyer_limit_silver, 32)
            .endCell(),
        });
    }

    async sendChangePrice(provider: ContractProvider, via: Sender, opts: {
        ton_price_silver: bigint;
        jetton_price_gold: bigint;
    }) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(4, 32)
                .storeUint(0, 64)
                .storeCoins(opts.ton_price_silver)
                .storeCoins(opts.jetton_price_gold)
            .endCell(),
        });
    }

    async sendWithdrawTon(provider: ContractProvider, via: Sender, opts: {
        address: Address;
        amount: bigint;
        send_mode: number;
    }) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(5, 32)
                .storeUint(0, 64)
                .storeAddress(opts.address)
                .storeCoins(opts.amount)
                .storeUint(opts.send_mode, 16)
            .endCell(),
        });
    }

    async sendWithdrawJetton(provider: ContractProvider, via: Sender, opts: {
        jetton_wallet_address: Address;
        address: Address;
        amount: bigint;
    }) {
        await provider.internal(via, {
            value: toNano("0.05"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(6, 32)
                .storeUint(0, 64)
                .storeAddress(opts.jetton_wallet_address)
                .storeAddress(opts.address)
                .storeCoins(opts.amount)
            .endCell(),
        });
    }


    async getCollectionData(provider: ContractProvider) {
        const result = await provider.get("get_collection_data", []);
        return {
            index: result.stack.readNumber(),
            content_collection: result.stack.readCell(),
            owner_user: result.stack.readAddress()
        };
    }

    async getItemAddress(provider: ContractProvider, nftIndex: number) {
        const tuple = new TupleBuilder()
        tuple.writeNumber(nftIndex);
        const result = await provider.get("get_nft_address_by_index", tuple.build());
        return {
            nft_item_address: result.stack.readAddress()
        };
    };

    async getAllInformation(provider: ContractProvider) {
        const result = await provider.get("get_all_information", []);
        return {
            owner_address: result.stack.readAddress(),
            last_index: result.stack.readNumber(),
            buyer_limit_silver: result.stack.readNumber(),
            ton_price_silver: result.stack.readNumber(),
            jetton_price_gold: result.stack.readNumber(),
            content_collection: result.stack.readCell(),
            content_item_gold: result.stack.readCell(),
            content_item_silver: result.stack.readCell(),
            jetton_wallet_address: result.stack.readAddress(),
        };
    };
}
