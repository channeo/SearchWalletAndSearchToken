import { ethers } from 'ethers';
import dotenv from 'dotenv';
import axios from 'axios';
import { request, gql } from 'graphql-request';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
// Hàm delay thay cho setTimeout từ timers/promises
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const;

// Giao diện cho kết quả token
interface TokenResult {
  address: string;
  name: string;
  symbol: string;
  source: string;
  totalSupply?: string;
  decimals?: number;
  totalSupplyFormatted?: string;
}

// Hàm getTokenByAddress
async function getTokenByAddress(address: string, providerUrl: string = process.env.ALCHEMY_SEPOLIA || 'https://eth-sepolia.g.alchemy.com/v2/uWe4vAwqREWWqpLqBYBNB') {
  
  const provider = new ethers.JsonRpcProvider(providerUrl);
  try {
    const code = await provider.getCode(address);
    if (code === '0x') {
      console.error(`Không tìm thấy hợp đồng tại địa chỉ ${address} trên mạng này`);
      return null;
    }

    const contract = new ethers.Contract(address, ERC20_ABI, provider);
    console.log(`Đang lấy thông tin token cho địa chỉ: ${address}`);
    const [name, symbol, totalSupply, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
      contract.decimals(),
    ]);

    if (!name || !symbol || !totalSupply || decimals === undefined) {
      console.warn(`Dữ liệu trả về không đầy đủ hoặc không hợp lệ cho địa chỉ ${address}`);
      return null;
    }

    return {
      address: address.toLowerCase(),
      name,
      symbol,
      totalSupply: totalSupply.toString(),
      decimals: Number(decimals),
      totalSupplyFormatted: ethers.formatUnits(totalSupply, decimals),
    };
  } catch (error: any) {
    console.error(`Lỗi khi lấy thông tin token ${address}:`, error.message);
    if (error.code === 'BAD_DATA') {
      console.warn(`Hợp đồng tại ${address} có thể không phải token ERC-20 hoặc không được triển khai trên mạng này.`);
    } else if (error.code === 'CALL_EXCEPTION') {
      console.warn(`Gọi hợp đồng thất bại. Có thể hợp đồng không tồn tại hoặc không hỗ trợ phương thức ERC-20.`);
    }
    return null;
  }
}

// Hàm getTokenByName sử dụng Etherscan API
async function getTokenByName(name: string, providerUrl: string): Promise<TokenResult[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY || 'AE4G71D84ED2F7THA1SDB9J113MQD8VYWI';
  try {
    console.log(`Đang tìm kiếm token với tên: "${name}" trên Etherscan`);
    const response = await axios.get(`https://api-sepolia.etherscan.io/api`, {
      params: {
        module: 'token',
        action: 'tokenlist',
        apikey: apiKey,
      },
    });

    const tokens = response.data.result || [];
    console.log(`Tìm thấy ${tokens.length} token trên Etherscan`);
    const tokenResults: TokenResult[] = [];

    for (const token of tokens) {
      try {
        const tokenInfo = await getTokenByAddress(token.contractAddress, providerUrl);
        if (tokenInfo && (tokenInfo.name.toLowerCase().includes(name.toLowerCase()) || tokenInfo.symbol.toLowerCase().includes(name.toLowerCase()))) {
          tokenResults.push({ ...tokenInfo, source: 'etherscan-blockchain' });
        }
      } catch (error: any) {
        console.warn(`Lỗi khi xử lý token ${token.contractAddress}:`, error.message);
      }
    }

    if (tokenResults.length === 0) {
      console.warn(`Không tìm thấy token nào với tên "${name}" trên Etherscan`);
    }
    return tokenResults;
  } catch (error: any) {
    console.error('Lỗi Etherscan:', error.message);
    return [];
  }
}

// Hàm searchToken tổng quát
async function searchToken(query: string, providerUrl: string): Promise<TokenResult[]> {
  if (ethers.isAddress(query)) {
    console.log(`Tìm kiếm theo địa chỉ hợp đồng: ${query}`);
    const tokenInfo = await getTokenByAddress(query, providerUrl);
    if (tokenInfo) {
      return [{ ...tokenInfo, source: 'blockchain' }];
    }
    return [];
  }

  console.log(`Tìm kiếm theo tên token: "${query}"`);
  const tokens = await getTokenByName(query, providerUrl);
  return tokens;
}

app.get('/search', async (req: Request, res: Response) => {
  const query = req.query.query as string;
  if (!query) {
    return res.status(400).json({ error: 'Thiếu tham số query' });
  }

  const providerUrl = process.env.ALCHEMY_SEPOLIA || 'https://eth-sepolia.g.alchemy.com/v2/uWe4vAwqREWWqpLqBYBNB';
  const tokens = await searchToken(query, providerUrl);
  res.json(tokens);
});

// Chạy server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend server đang chạy trên port ${port}`);
});

