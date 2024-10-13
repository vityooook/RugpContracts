import { toNano, Address, Dictionary, TonClient, beginCell } from '@ton/ton';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';


export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromAddress(Address.parse("kQCOf71IcmD-Diums9vlKyRjK8oBDynLS9rGIyearfQM_L_2")))

    // добавить функцию для вычеслениия адресса 
    await nftCollection.sendDeployNftTon(provider.sender(), toNano("0.3"))


    // run methods on `nftCollection`
}
